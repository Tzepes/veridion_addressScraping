const { Worker } = require('worker_threads');
const parquet = require('@dsnp/parquetjs');

(async () => {
    let reader = await parquet.ParquetReader.openFile('websitesFiltered.snappy.parquet');
    let cursor = reader.getCursor();
    const domains = [];

    let beginAt = 0;
    let endAt = 2000;
    let index = 0;

    let record;
    while (record = await cursor.next()) {
        if (index < beginAt) {
            index++;
            continue;
        }
        
        // if (!record.domain.endsWith('.de') && !record.domain.endsWith('.uk')){
            domains.push(record.domain);
        // }
        
    }
    console.log('number of domains:', domains.length);
    
    const numThreads = 8; // Adjust based on your CPU cores
    const chunkSize = Math.ceil(domains.length / numThreads);
    const workerPromises = [];

    for (let i = 0; i < numThreads; i++) {
        const chunk = domains.slice(i * chunkSize, (i + 1) * chunkSize);
        workerPromises.push(runWorker(chunk));
    }

    try {
        await Promise.all(workerPromises);
        console.log('All workers have finished processing');
    } catch (error) {
        console.error('An error occurred:', error);
    }
    await reader.close();
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
