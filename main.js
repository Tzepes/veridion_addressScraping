const { Worker } = require('worker_threads');
const parquet = require('@dsnp/parquetjs');

(async () => {
    let reader = await parquet.ParquetReader.openFile('falseResultedLinks.parquet');
    let cursor = reader.getCursor();
    let domains = [];

    let beginAt = 1000;
    let endAt = 2000;
    let index = 0;

    let record;
    while (record = await cursor.next()) {
        // if (index < beginAt) {
        //     index++;
        //     continue;
        // }
        if (!record.domain.endsWith('.us') || !record.domain.endsWith('.com') || !record.domain.endsWith('.net') || !record.domain.endsWith('.org')) {
            domains.push(record.domain);
        }
    }
    console.log('number of domains:', domains.length);
    
    const numThreads = 8; // Adjust based on your CPU cores
    const chunkSize = Math.ceil(domains.length / numThreads);
    const workerPromises = [];

    for (let i = 0; i < numThreads; i++) {
        const chunk = domains.slice(i * chunkSize, (i + 1) * chunkSize);
        workerPromises.push(runWorker(chunk));
    }

    await Promise.all(workerPromises);
    await reader.close();
    console.log('All workers have finished processing');
})();

function runWorker(domains) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('./worker.js', { workerData: { domains } });
        worker.on('message', (message) => {
            if (message === 'done') {
                resolve();
            }
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}
