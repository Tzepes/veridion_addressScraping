const { NlpManager } = require('node-nlp');

const extractAddress = async (text) => {
  const manager = new NlpManager({ languages: ['en', 'de', 'fr', 'es'], nlu: { useNoneFeature: false } });

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

  const englishExamples = [
    '1739 S. Jade Way',
    '613 Franklin Street',
    '325 Fulton',
    '4343 Highway 224',
    '117 Riviera Drive',
    '499 East Tioga Street',
    '9168 Hermosa Avenue',
    '900 West 45th Street',
    '2018 Brevard Road',
    '604 Railroad Avenue',
    '8904 Sony Lane',
    '221B Baker Street',
    '10 Downing Street',
    '1600 Pennsylvania Avenue',
    '1 High Street',
    '25 King’s Road',
    '50 Queen Street',
    '75 Church Lane',
    '200 Victoria Street',
    '300 Oxford Road',
    '400 Queen’s Park',
    '9800 S. La Cienega Blvd.'
  ];
  
  englishExamples.forEach(example => {
    manager.addDocument('en', `Street: ${example}`, 'address');
    manager.addDocument('en', `Address: ${example}`, 'address');
    manager.addDocument('en', `${example}`, 'address');
    manager.addDocument('en', `${example}`, 'address');
    manager.addDocument('en', example, 'address');
  });

  // Adding comprehensive patterns for German addresses with new examples
  const germanExamples = [
    '1739 S. Jade Weg',
    '613 Franklin Straße',
    '325 Fulton',
    '4343 Autobahn 224',
    '117 Riviera Straße',
    '499 Ost Tioga Straße',
    '9168 Hermosa Allee',
    '900 West 45th Straße',
    '2018 Brevard Weg',
    '604 Eisenbahn Allee',
    '8904 Sony Straße',
    'Unter den Linden 17',
    'Marienplatz 1',
    'Königsallee 1',
    'Bahnhofstraße 1',
    'Friedrichstraße 43',
    'Ludwigstraße 21',
    'Schlossstraße 20',
    'Zeil 106',
    'Kaiserstraße 22',
    'Marktplatz 2'
  ];

  germanExamples.forEach(example => {
    manager.addDocument('de', `Straße: ${example}`, 'address');
    manager.addDocument('de', `Adresse: ${example}`, 'address');
    manager.addDocument('de', `${example}`, 'address');
    manager.addDocument('de', `${example}`, 'address');
    manager.addDocument('de', example, 'address');
  });

  // Adding comprehensive patterns for French addresses with new examples
  const frenchExamples = [
    '1739 S. Jade Chemin',
    '613 Franklin Rue',
    '325 Fulton',
    '4343 Autoroute 224',
    '117 Riviera Rue',
    '499 Est Tioga Rue',
    '9168 Hermosa Avenue',
    '900 Ouest 45th Rue',
    '2018 Brevard Chemin',
    '604 Chemin de Fer Avenue',
    '8904 Sony Rue',
    '10 Avenue des Champs-Élysées',
    '5 Rue de la Paix',
    '20 Boulevard Saint-Germain',
    '15 Rue de Rivoli',
    '30 Avenue de l',
    '40 Rue de la Victoire',
    '50 Rue Lafayette',
    '60 Boulevard Haussmann',
    '70 Rue Saint-Honoré',
    '80 Avenue des Ternes'
  ];

  frenchExamples.forEach(example => {
    manager.addDocument('fr', `Rue: ${example}`, 'address');
    manager.addDocument('fr', `Adresse: ${example}`, 'address');
    manager.addDocument('fr', `${example}`, 'address');
    manager.addDocument('fr', `${example}`, 'address');
    manager.addDocument('fr', example, 'address');
  });

  // Adding comprehensive patterns for Spanish addresses with new examples
  const spanishExamples = [
    '1739 S. Jade Camino',
    '613 Franklin Calle',
    '325 Fulton',
    '4343 Carretera 224',
    '117 Riviera Calle',
    '499 Este Tioga Calle',
    '9168 Hermosa Avenida',
    '900 Oeste 45th Calle',
    '2018 Brevard Camino',
    '604 Avenida del Ferrocarril',
    '8904 Sony Calle',
    '341 Calle Mayor',
    '721 Avenida de la Constitución',
    '934 Calle de Alcalá',
    '123 Gran Vía',
    '872 Paseo de la Castellana',
    '4786 Calle de Serrano',
    '9812 Calle de Goya',
    '413 Avenida Diagonal',
    '889 Rambla de Catalunya',
    '1421 Paseo de Gracia'
  ];

  spanishExamples.forEach(example => {
    manager.addDocument('es', `Calle: ${example}`, 'address');
    manager.addDocument('es', `Dirección: ${example}`, 'address');
    manager.addDocument('fr', `${example}`, 'address');
    manager.addDocument('fr', `${example}`, 'address');
    manager.addDocument('es', example, 'address');
  });

  // // Adding general address patterns for each language
  // const generalPatterns = [
  //   '%number% %street%, %city% %postalcode%',
  //   '%street% %number%, %city% %postalcode%',
  //   'Street: %number% %street%, %city% %postalcode%',
  //   'Address: %number% %street%, %city% %postalcode%',
  //   'Adresse: %number% %street%, %city% %postalcode%',
  //   'Straße: %number% %street%, %city% %postalcode%',
  //   'Rue: %number% %street%, %city% %postalcode%',
  //   'Calle: %number% %street%, %city% %postalcode%',
  //   'Dirección: %number% %street%, %city% %postalcode%',
  //   'Contact Info Address: %number% %street%, Suite %suite% %city% %postalcode%'
  // ];
  
  //   generalPatterns.forEach(pattern => {
  //     manager.addDocument('en', pattern, 'address');
  //     manager.addDocument('de', pattern, 'address');
  //     manager.addDocument('fr', pattern, 'address');
  //     manager.addDocument('es', pattern, 'address');
  //   });

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

  // Enhanced extraction logic to capture adjacent characters
  const extractEntities = (entities, type) => {
    return entities
      .filter(entity => entity.entity === type)
      .map(entity => entity.sourceText)
      .join(' ');
  };

  const numberEntity = extractEntities(response.entities, 'number');
  const streetEntity = extractEntities(response.entities, 'street');

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
const text2 = 'Identität des Verkäufers:GPmoto GmbHInhaber: Dennis HarmStraße: Rheder Str. 7 PLZ, Ort: 46499 HamminkelnTel.: 02852/507620E-Mail: service@gpmoto.deUSt-ID: DE334798152Alle Lieferungen und Leistungen an Verbraucher im Sinne des § 13 BGB und an Unternehmer im Sinne des § 14 BGB erfolgen ausschließlich auf Grundlage dieser AGB.'
const text3 = "DONATEThe California Black Women's Health Project is the only statewide, non-profit organization that is solely committed to ​improving the health of California's 1.2 million Black women and girls through advocacy, education, outreach and policy. CALIFORNIA BLACK WOMEN'S HEALTH PROJECT​​9800 S. La Cienega Blvd., Suite 905Inglewood, CA 90301​(310) 412-1828wellwoman@cabwhp.org​For media inquiries and marketing requests contact geneses@cabwhp.org​";
extractAddress(text3).then(console.log).catch(console.error);
