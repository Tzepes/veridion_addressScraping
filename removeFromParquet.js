const parquet = require('@dsnp/parquetjs');
const fs = require('fs');
const csv = require('csv-parser');

async function getProcessedDomains(csvFilePath) {
  return new Promise((resolve, reject) => {
    const processedDomains = new Set();
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        processedDomains.add(row.Domain);
      })
      .on('end', () => {
        resolve(processedDomains);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

async function filterParquetFile(parquetFilePath, processedDomains) {
  const reader = await parquet.ParquetReader.openFile(parquetFilePath);
  const cursor = reader.getCursor();

  let row;
  const filteredRows = [];

  while ((row = await cursor.next())) {
    if (!processedDomains.has(row.domain)) {
      filteredRows.push(row);
    }
  }

  await reader.close();
  return filteredRows;
}

async function writeFilteredParquetFile(filteredData, outputFilePath) {
  const schema = new parquet.ParquetSchema({
    domain: { type: 'UTF8' },
  });

  const writer = await parquet.ParquetWriter.openFile(schema, outputFilePath);

  for (const row of filteredData) {
    await writer.appendRow(row);
  }

  await writer.close();
}

// Main function to process the files
async function processFiles(parquetFilePath, csvFilePath, outputFilePath) {
  try {
    const processedDomains = await getProcessedDomains(csvFilePath);
    const filteredData = await filterParquetFile(parquetFilePath, processedDomains);
    await writeFilteredParquetFile(filteredData, outputFilePath);
    console.log('Filtered Parquet file created successfully');
  } catch (error) {
    console.error('Error processing files:', error);
  }
}

// Define file paths
const parquetFilePath = 'websites.snappy .parquet';
const csvFilePath = './results/finalResults/fullAddressResults.csv';
const outputFilePath = 'websitesFiltered.snappy.parquet';

// Process the files
processFiles(parquetFilePath, csvFilePath, outputFilePath);