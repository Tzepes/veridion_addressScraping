const { NlpManager } = require('node-nlp');

const extractAddress = async (text) => {
  const manager = new NlpManager({ languages: ['en', 'de', 'fr', 'es'], nlu: { useNoneFeature: false } });

  // Adding more comprehensive patterns for English addresses
  manager.addDocument('en', 'Street: %number% %street%', 'address');
  manager.addDocument('en', 'Address: %number% %street%', 'address');
  manager.addDocument('en', '%number% %street%', 'address');
  manager.addDocument('en', '%street% %number%', 'address');
  manager.addDocument('en', 'Contact Info Address: %number% %street% %city% %postalcode%', 'address');
  manager.addDocument('en', 'Address: %number% %street% %city% %postalcode%', 'address');
  manager.addDocument('en', '%street% %number%, %city%, %postalcode%', 'address');

  // Adding more comprehensive patterns for German addresses
  manager.addDocument('de', 'Straße: %street% %number%', 'address');
  manager.addDocument('de', 'Adresse: %number% %street%', 'address');
  manager.addDocument('de', '%street% %number%', 'address');
  manager.addDocument('de', '%number% %street%', 'address');
  manager.addDocument('de', 'Kontakt Info Adresse: %number% %street% %city% %postalcode%', 'address');
  manager.addDocument('de', 'Adresse: %number% %street% %city% %postalcode%', 'address');
  manager.addDocument('de', '%street% %number%, %city%, %postalcode%', 'address');

  // Adding more comprehensive patterns for French addresses
  manager.addDocument('fr', 'Rue: %number% %street%', 'address');
  manager.addDocument('fr', 'Adresse: %number% %street%', 'address');
  manager.addDocument('fr', '%street% %number%', 'address');
  manager.addDocument('fr', '%number% %street%', 'address');
  manager.addDocument('fr', 'Contact Info Adresse: %number% %street% %city% %postalcode%', 'address');
  manager.addDocument('fr', 'Adresse: %number% %street% %city% %postalcode%', 'address');
  manager.addDocument('fr', '%street% %number%, %city%, %postalcode%', 'address');

  // Adding more comprehensive patterns for Spanish addresses
  manager.addDocument('es', 'Calle: %number% %street%', 'address');
  manager.addDocument('es', 'Dirección: %number% %street%', 'address');
  manager.addDocument('es', '%street% %number%', 'address');
  manager.addDocument('es', '%number% %street%', 'address');
  manager.addDocument('es', 'Información de contacto Dirección: %number% %street% %city% %postalcode%', 'address');
  manager.addDocument('es', 'Dirección: %number% %street% %city% %postalcode%', 'address');
  manager.addDocument('es', '%street% %number%, %city%, %postalcode%', 'address');


  // Define street and number entities for all languages
  manager.addNamedEntityText(
    'number',
    'number',
    ['en', 'de', 'fr', 'es'],
    ['\\d{1,5}'] // Adjusted to match typical street numbers
  );

  manager.addNamedEntityText(
    'postalcode',
    'postalcode',
    ['en', 'de', 'fr', 'es'],
    ['\\d{4,5}', '\\d{5}-\\d{4}', '\\d{3}-\\d{3}'] // Adjusted to match typical postal codes
  );

  manager.addNamedEntityText(
    'street',
    'street',
    ['en'],
    ['Main Street', 'First Avenue', 'Second Street', 'Third Avenue', 'Fourth Street', 'Fifth Avenue', 'Elm Street', 'Oak Street', 'Maple Avenue', 'Pine Street', 'Rheder Str.', 'Baker Street', 'Rd', 'Road', 'Street', 'St', 'Str', 'Drive', 'Way', 'Blvd', 'Boulevard', 'Ave', 'Avenue', 'Lane', 'Court', 'Pl', 'Place', 'Terrace', 'Crescent', 'Park', 'Parkway', 'Circle']
  );

  manager.addNamedEntityText(
    'street',
    'street',
    ['de'],
    ['Rheder Str.', 'Hauptstraße', 'Bahnhofstraße', 'Schulstraße', 'Gartenstraße', 'Ringstraße', 'Bahnhofsplatz', 'Kirchstraße', 'Lindenstraße', 'Münchner Str.', 'Str.', 'Straße', 'Weg', 'Allee', 'Gasse', 'Platz', 'Ring', 'Chaussee', 'Damm', 'Ufer', 'Steig', 'Pfad', 'Promenade', 'Schleife', 'Gartenweg', 'Ringstraße', 'Bahnhofstraße', 'Lindenstraße', 'Brücke', 'Bogen']
  );

  manager.addNamedEntityText(
    'street',
    'street',
    ['fr'],
    ['Rue de Rivoli', 'Avenue des Champs-Élysées', 'Boulevard Saint-Germain', 'Rue Saint-Honoré', 'Avenue de la Grande Armée', 'Rue de la Paix', 'Rue', 'Avenue', 'Boulevard', 'Chemin', 'Allée', 'Impasse', 'Place', 'Voie', 'Passage', 'Route', 'Quai', 'Cour', 'Cité', 'Esplanade', 'Promenade', 'Traverse', 'Sentier', 'Rond-point', 'Carrefour', 'Square']
  );

  manager.addNamedEntityText(
    'street',
    'street',
    ['es'],
    ['Calle Mayor', 'Avenida de la Constitución', 'Calle de Alcalá', 'Gran Vía', 'Paseo de la Castellana', 'Calle de Serrano', 'Calle', 'Avenida', 'Carretera', 'Camino', 'Paseo', 'Plaza', 'Vía', 'Ronda', 'Bulevar', 'Travesía', 'Sendero', 'Autopista', 'Calzada', 'Vereda', 'Puente', 'Glorieta', 'Alameda', 'Parque', 'Plazuela', 'Callejón']
  );

  // Train the NLP manager
  await manager.train();
  manager.save();

  // Process the text to extract the intent and entities
  const response = await manager.process(text);

  // Extract and format the address
  if (response.intent === 'address') {
    const numberEntity = response.entities.find(entity => entity.entity === 'number');
    const streetEntity = response.entities.find(entity => entity.entity === 'street');
    
    if (numberEntity && streetEntity) {
      const address = `${streetEntity.sourceText} ${numberEntity.sourceText}`;
      return address;
    } else {
      return 'No complete address found';
    }
  } else {
    return 'No address intent detected';
  }
};

// Make function to access already trained model: mode.nlp

// Example usage
const text = 'Contact Info Address: 503 Maurice Street Monroe, NC 28112';
extractAddress(text).then(console.log).catch(console.error);
