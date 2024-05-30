const { Worker } = require('worker_threads');
const parquet = require('@dsnp/parquetjs');

(async () => {
    let reader = await parquet.ParquetReader.openFile('websitesFiltered.snappy.parquet');
    let cursor = reader.getCursor();
    let domains = [];

    let record;
    while (record = await cursor.next()) {
        domains.push(record.domain);
    }

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
