### Introduction
We have the following problem to tackle: get addresses off websites of companies from a given list of links, and organize the data in the following format: Domain,Country,Region,City,Postcode,Road,Road Number .
Why gather this information ? Such data can be used for geospatial analysis, enabling mapping of regional market trends and demographic data. This data can also help in logistical planning and risk management.

We will go ahead and access each link from ``websites.snappy.parquet``. We will have to get the textual data from it and find the address inside
### Technologies
Languages used: 
NodeJS (which will be the scraper) 
* Puppeteer (great headless browser which will help us scrape javascript loaded content too)
* Axios
* Cheerio
Python (with which we will create APIs to access trained ML Models)
* Spacy (for training NER models and, their pre-trained models will come in handy too)
* FastAPI

### Addresses types
Every country has it's own pattern or format for a full address, so, let's see what we have to work it. Before we get into the initial scraping, let's see what extensions are we have and what languages. After making a quick script to add each domain to a CSV file and label the domain extension: .com, .co.uk etc., and also taking the text of the first page and use Node-NLP's language guess to see what languages are on these pages, i have added these to Mongo's Charts so we can see visualize this.

Based on URL:
![Description](./screenshots/Pasted%20image%2020240527171621.png)

And based on Language:
![Description2](./screenshots/Pasted%20image%2020240527171714.png)

I have compared both the domain and language because, just if a domain is .com, it can be anything, and if it's .de, it could easily be Austrian instead of German. This is something we will need to address later down the development of the scraper, but for now, we know that the main countries we need to take into account are US, UK and Germany. This way we can focus on the functionality of the scraper, to then later on expand it's reach.
### Getting the Data
First things first, we need to get the data. We can do that just with Axios but there will be cases where Axios will fail, especially in the case of JS loaded content. Puppeteer is a very popular tool used for scraping, a headless browser, an open-source project owned by Google. Using puppeteer will also open up the door to using other tools that can help our scraping script alot, such as Bright Data, in case we want to bypass Chaptas or we have issues with IP Bans. We will also use Cheerio to ease control over HTML elements.

Now, getting the html content will be easy, having our script loop trough the links from the .parquet file, and then take the data of each link and process it. But the issue is that sometimes, it will be a lot of irrelevant information. Such as `<script>` tags, the header or anything else. We will ignore these and take only the `<body>`.
### Finding and verifying the Address
Now that we have the HTML content, how do we go about in finding the address ? If we look at any example, it's a huge mess of HTML. And the address could be located anywhere within the page, in the middle of it, top, bottom, or on another link of the page like a `contacts` tab.

We'll first do a bit of data pre-processing as mentioned before, taking only the `<body>`, and inside it we will also make sure to remove irrelevant data, like images, scripts, and so on. Such data will cause big issues to our scrapper, resulting in inaccuarate and eronus extraction.

But what do we do with the remaining HTML ? All of our text is inside of those elements. 
We will use the HTML elements to our advantage, this way we can take segments of text, which will be much easier to work with. 

While we are at this, we will also extract the links from `a` tags, so in case the address is not on the main page, we will search on other pages. Later on we will implement a local API built with python, where we will use matching tehniques, so we prioritize routes that are similar to the initial domain and avoid going on potential foreign domains of other companies.

After looking trough a couple of pages to see the pattern, I've decided to have the scrapper loop trough elements with the following priority: `'p', 'address', 'font', 'span', 'strong', 'div'`.  This way, we can prioritize small segments of text in which addresses are located most of the times. The `div` tag will be a good backup in case the data is not structured the way we want it to.

Now how do we know when to stop when looping trough the page? Addressed come in many forms and can be irregular. Here are some examples of valid addresses: 

```
1)  102 main street
    Anytown, state

2)  400n 600e #2, 52173

3)  p.o. #104 60203
```

Even these are possibly valid:

```
4)  829 LKSDFJlkjsdflkjsdljf Bkpw 12345

5)  205 1105 14 90210
```

But one thing seems to always be present, and that is the postcode, which has a unique format for every country. US postcodes are formed of 5 numbers, German also of 5, Romanian of 6 and UK of a set of characters and numbers. 

Regex will find the postcode perfectly and we can create a list of regexes for each country. 

Although this is not enough, we need to validate it. There can be cases where we look for a US postcode, and a 5 digit number is located in the page, and it's not the postcode. We will extract the wrong text and we can't allow that.

For the moment, a great solution is gathering all matching numbers, and pass them trough postcode APIs, which will also return the City and Region. This way we have already satisfied 3 of the columns of our resulted dataset. 

Every country has it's own database for their zipcodes and we can get their APIs. But for the moment, we will use ParseAPI, which is a postcode API for US, which is free, and ZipCodeBase which has a limited amount of uses, but it's international, so it will be a great tool durring development.

Here is an example of how our data looks so far:
![Description 3](./screenshots/Pasted%20image%2020240526213841.png)

It's a great start! But the data is incomplete of course, the street is missing, and there seem to be occasions when not even the postcode is extracted, But now we know where the address is located in the page, we can take the text where the postcode is located, and it will contain the rest of the address.

We will have to clean our data up to make it easier for our code to extract the address.

NOTE: So far, this is a great approach, but it comes with it's own edge cases which we will have to address, one example being that, some US street numbers are the same size of the postcode, and they can coincidentally be a valid postcode as well. 
### Cleaning the Data
Before we get the rest of the details from the address, we need to clean the text up. Many text samples we extract will come in with unencoded characters, potentially, leftover HTML and so on. These will hinder our process of accurately and correctly extract address. 

We don't want to remove to many content either. A lot of symbols can provide context like comas, and many german street names, have '-' in them. So we will only focus for the text to look clean and human like.

With proper cleaning, we can ensure that the texts which we will evaluate, will look as the following:
```
div
1739 S Jade Way, Suite 100 Meridian, Idaho 83642 

p
Richard Brothers Financial Advisors 50 Donald B Dean Drive, Suite 1 South Portland, Maine 04106 

p
 8904 Sony Lane, Knoxville, TN 37923 

p
2355 Chain Drive, Ste: D Simi Valley, CA 93065 

div
105 Spit Brook Rd, Nashua, NH 03062, United States 

p
101 S Market Street Frederick, MD 21701 301-228-3670 

div
National Business Park 302 Sentinel Drive Annapolis Junction, MD 20701 

span
122 E Patrick St 120, Frederick, MD 21701, Statele Unite ale Americii 
```

We can also remove irrelevant information that can be spotted, such as phone numbers and emails, which might make the label of addresses finicky. So in the case of this text: `101 S Market Street Frederick, MD 21701 301-228-3670`, we will have `101 S Market Street Frederick, MD 21701`. Better looking text for a small amount of effort.
### NER Models
So, how do we go about labeling our addresses in the format we want ? Because, at the end of the day, as much data cleaning we try to do, we will surely miss something. Addresses in companies websites will be very irregular, many might have a pattern but it will not be always the same. And let's say we want to use regex, we can definitely look for Street, St, Drive, etc.  

But what about this street? `1739 S Jade Way`
We put way in our regex, but how do we know how many tokens we take to take the full name ? There are cases like this, numbers at the start and end of the street name `122 E Patrick St 120`.

List goes on, regex is not the solution of such a task. It works great for the postcode, yes, but that's because in that case, we look only for one singular token with a very specific pattern. 

This is a great task for a Named Entity Recognition model. It's an ML tehnique that works on classification and it's statistical, and that's what we need to do, we need to classify which element of the address is what. These models are also rule based, and work great if they are trained with a context in mind. 

But they can still fail when it comes to context. For example, `Jordan`, can be both a person and the country, if we come with a text `I'm going to Jordan`, the result will be based on the context and entities we trained the model with. 

Fortunately this is not a big issue for us, because address still tend to have a pattern, and we already have our trusty postcode APIs that finish more then half of the job. We only need to get the street now.

I have chosen to go with Spacy after reading trough some articles about NER Models. Spacy has it's own models for many purposes, including an NER system which we can train specifically for our task. And their trained pipeline is already very good at finding companies and locations, which will help us even more.

##### Training Strategy
How do we go about training the model ? What is a good approach ? 
This paper: [Named Entity Recognition for Address Extraction in Speech-to-Text Transcriptions Using Synthetic Data](https://arxiv.org/pdf/2402.05545), present's a popular approach for our type of problem, BIO annotation, which is an abbreviation of (Beginning, Inside, Outside). So we will mark texts containing an address with the Outside text of the address, which is text non related to the address itself, Beginning text of the address, which will be the first token of the address, and the Inside text of the address. This is a great approach because as mentioned, no matter how much we clean our data, we can't address all edge cases, we need to teach our model what does an address look like, where does it start and where does it end. 

Here is a BIO annotation example (as presented in the paper): 
`Plant Location: 835 Township Line Rd Phoenixville, PA 19460-3097`
O - Plant; O - Location; O - : ; B - 835 (Beginning of street num); B - Township(Beginning of street name); I - Line (Inside street name); 
I - Rd (Inside street name) B - PhoenixVille (Beginning of city), O - , ; B - PA (Beginning of state); B - 19460(Beginning of postcode); I - '-' (Inside postcode); I - '3097'(Inside of postcode)

Now, Spacy doesn't present a BIO annotation available for their model, but something rather similar. Training data for Spacy is by mentioned the limits of each token, having it labeled aproprietly. 

But so for the approach sounds good, if we look at more examples, we can notice that there is a rather unique patter, and if there are differences in patters for the same country, they are very few, making it easy to train the model.
##### Training Data
Now that we have a strategy, we only need the right data to train our Spacy NER address parser. Unfortunately, it's easier said then done.

It is a similar issue the authors of the earlier mentioned paper came across too. We need to train the model with the type of data we will send to him to evaluate, and that's very organic data, and we will need alot of examples. It will not be enough to train our model with a plain full address because the texts we will find wont always be like that.

The good thing is, we already have some data. We can use the scraper we've build so far, and take the texts extracted together with the postcode, which comes in various forms:
`WICKED ISLAND BAKERY 7 B BAYBERRY COURT NANTUCKET, MA 02554 WICKEDISLANDBAKERY@GMAIL COM 
`Plant Location: 835 Township Line Rd Phoenixville, PA 19460-3097 
`Mailing Address 160 Alamo Plaza Unit 1239 Alamo, CA 94507 Phone: 925-674-1000 Toll Free: 800-510-1095 Fax: 925-503-0472 Email: info@brmins com 
`Country Inn Suites, 236 Old Epps Bridge Road, Athens 30606 SCHEDULED TO SPEAK 

And with this, we can follow the approach of the paper, because we'll need more example texts. We will take about 100 of the extracted texts we have, and make calls to the OpenAI api to have it generate more texts similar to them. We will also ask OpenAI to generate them in a CSV Format. The results still required some manual work, since the generation and labeling was not perfect. 

```
Text,Address,Street_Number,Street_Name,Street_Address,City,Zip_Code,State,Country
"7700 Las Vegas Blvd South Strip Las Vegas NV 89123 Contact us at Reservations: 702 736-4939 Take Out: 702 736-7080 Home Menu Our Story Entertainment Awards Parties Events Shop More... Use tab to navigate through the menu items.","7700 Las Vegas Blvd South Strip Las Vegas NV 89123",7700,Las Vegas Blvd South,7700 Las Vegas Blvd South,Las Vegas,89123,NV,
"OUR OFFICE 114 Joey Drive, Elk Grove Village, Il 60007","114 Joey Drive, Elk Grove Village, Il 60007",114,Joey Drive,114 Joey Drive,Elk Grove Village,60007,Il,
"EMAIL: sales@airservicesco.com Career Inquires: HR@airservicesco.com 211 Seegers Avenue Elk Grove Village, IL 60007 847 725-2100 COVID-19 STATEMENT","211 Seegers Avenue Elk Grove Village, IL 60007",211,Seegers Avenue,211 Seegers Avenue,Elk Grove Village,60007,IL,
"May 15 2024 Open House all day May 15 2024 Student Safety Committee Meeting 4 : 00 PM - 5 : 00 PM May 15 2024 LCAP PAC meeting 6 : 00 PM - 7 : 30 PM 351 S. Hudson Ave., Pasadena, CA 91101","351 S. Hudson Ave., Pasadena, CA 91101",351,S. Hudson Ave.,351 S. Hudson Ave.,Pasadena,91101,CA,
"Get In Touch! 573-883-7097 Welcome Center 66 South Main Street Ste. Genevive, MO 63670 info@visitstegen.com","66 South Main Street Ste. Genevive, MO 63670",66,South Main Street,66 South Main Street,Ste. Genevive,63670,MO,
```

The data looks good, it's organic and non repetitive. It contains both examples from the links we scraped and generated examples. Now with a good training data set in a CSV format, we only need to to write a `py` script to pre-process it and convert it into Spacy's docbin type for training the model.

##### Training the model
So now that we have the data, let's initiate training!

```
ℹ Saving to output directory: output\models                         4-289eead4f775
ℹ Using CPU

=========================== Initializing pipeline ===========================
✔ Initialized pipeline

============================= Training pipeline =============================
ℹ Pipeline: ['ner', 'entity_ruler']
ℹ Initial learn rate: 0.001
E    #       LOSS NER  ENTS_F  ENTS_P  ENTS_R  SCORE
---  ------  --------  ------  ------  ------  ------
  0       0     65.92   12.28    9.26   18.23    0.12
  0      10    832.94    8.61   52.94    4.69    0.09
  1      20    556.31   56.19   66.91   48.44    0.56
  1      30    322.49   74.57   83.77   67.19    0.75
  2      40    225.68   72.92   72.92   72.92    0.73
  3      50    155.22   83.65   86.19   81.25    0.84
  3      60    109.78   86.24   87.63   84.90    0.86
  4      70     96.27   86.91   87.37   86.46    0.87
  5      80     89.88   92.03   90.86   93.23    0.92
  5      90     49.84   91.24   90.31   92.19    0.91
  6     100     40.01   94.63   92.96   96.35    0.95
  7     110     28.16   93.19   93.68   92.71    0.93
  7     120     16.62   95.14   93.47   96.88    0.95
  8     130      6.21   93.81   92.86   94.79    0.94
  9     140      6.91   94.30   93.81   94.79    0.94
  9     150      7.04   93.85   92.42   95.31    0.94
 10     160     28.90   93.30   92.35   94.27    0.93
 11     170     13.93   93.30   92.35   94.27    0.93
 12     180     11.61   93.81   92.86   94.79    0.94
 12     190     11.70   94.85   93.88   95.83    0.95
 13     200      6.62   94.87   93.43   96.35    0.95
 14     210      8.99   94.60   93.40   95.83    0.95
 15     220     11.48   92.99   92.75   93.23    0.93
 15     230      7.40   94.87   93.43   96.35    0.95
 16     240      6.17   94.63   92.96   96.35    0.95
 17     250      0.93   95.38   93.94   96.88    0.95
 18     260      2.49   94.87   93.43   96.35    0.95
 18     270      3.61   94.09   92.89   95.31    0.94
 19     280      2.01   94.60   93.40   95.83    0.95
 20     290      0.05   94.87   93.43   96.35    0.95
 21     300      0.00   94.87   93.43   96.35    0.95
```

Score looks great and the Loss score went to 0. Now this doesn't mean our model is perfect, but we are on the right path. We can continue to train or model along development, once we gather more data and we come across more edge cases.

Let's give it a text and see the result:
```
"text": "Copyright document.writenew Date.getFullYear; 2024 Systemadix All Rights Reserved. info@systemadix.com 240.479.7700 122 East Patrick Street, Suite 120, Frederick, MD 21701"
"result":{
    "City": "Frederick",
    "State": "MD",
    "Street_Name": "East Patrick Street",
    "Street_Num": "122",
    "Zipcode": "21701"
}
`````

Result looks great! This is also an example from the extracted texts from our addresses. I have tested it against multiple cases with a reasonable amount of tokens and the extraction is good, but it will still fail sometimes:
```
"text": "Contractor Address City Phone Denali Sewer 2900 Boniface 537 Anchorage 907 333 5794 Alaska Drainfield Restorations 17228 Juanita Loop N Eagle River 907 696 0899"
"results": {
    "City": "Phone Denali Sewer",
    "State": null,
    "Street_Name": "Eagle River",
    "Street_Num": "0899",
    "Zipcode": "696"
}
```
In this case, the phone number causes an eronus extraction, but if we remove such details: `"Contractor Address City Phone Denali Sewer 2900 Boniface 537 Anchorage Alaska Drainfield Restorations 17228 Juanita Loop N Eagle River",`

The result ends up a little better:
```
{
    "City": "Phone Denali Sewer",
    "State": null,
    "Street_Name": "Eagle River",
    "Street_Num": "2900",
    "Zipcode": "17228"
}
```
At least now we have the Street and Zipcode correct, but with a bit more text pre-processing and more training data, our model will become more robust.

NOTE: Due to the approach we've taken, we will need to train and individual model for each country. We have the strategy so it will only be repetitive work.
### Putting the scraper and NER model together
We have to address one little inconvenience, and that is that our scraper is build in NodeJS and the NER model is in Python. But we can easily create a local Python API. So we will send the text we want analyzed trough the API and get it back to post it into our results CSV file. We will declare a body to be sent trough the API, because we will also want a field for the country to select the proper model. The python script can also be made to recognize the language and select based on that, but it wont be the main approach for this can come with issues.

Here is a look at our API in postman:
![Description 4](./screenshots/Pasted%20image%2020240527164111.png)

Looks great, it's all coming together now. Let's implement it in our scraper and look at the results:
![Description 5](./screenshots/Pasted%20image%2020240527164206.png)

It looks great! Apart from some wrong extractions, and some symbols that we should clean up. From now on, all we have to do is address these edge cases and train the models for other countries

But before that, there is one more main thing we need to take care of, and that is, not all companies have their address on their page.
### What if there is no address on the page?
There is plenty of cases where it acts as no more then just a landing page, talking about the company and what it does, or cases where the address is very inconsistent, or only half of it is in the page.

Well, this is where Spacy comes to the resque again. Spacy has it's pretrained NER models for many languages, which we can use to extract Company names and Locations. Here is an example from their documentation: 
![Description 6](./screenshots/Pasted%20image%2020240527165246.png)

Let's take one of their model's, put it on another local API, and pass in a text from a page from our list and see what we get.
Here is the result from the text of Umbra Window Tinting:
```
"GPE": [
        "Glendale Heights",
        "Schaumburg",
        "Glendale Heights",
        "Schaumburg",
        "Glendale Heights",
        "Schaumburg",
        "Schaumburg",
        "Glendale Heights",
        "Chicago",
        "Chicago",
        "Chicago",
        "SCHAUMBURG",
        "Schaumburg",
        "IL",
        "United States",
        "Glendale Heights",
        "IL",
        "United States"
    ],
    "ORG": [
        "Umbra",
        "Umbra Window Tinting",
        "Tesla",
        "Umbra Window Tinting",
        "Umbra Window Tinting",
        "NORTHERN  ",
        "Umbra Window Tinting",
        "Tesla",
        "Tesla",
        "Detailers Roadmap",
        "8bitcreative, LLC"
    ],
```

And now, let's take each ORG and sort it along with the GPE that was found next to it, and sort them based on the similarity to the URL(which in most cases, if not all, it's the name of the company or institution), and avoid duplicates.

```
"ORG_GPE_Sorted": [
        "Umbra Glendale Heights",
        "Umbra Window Tinting Schaumburg",
        "Umbra Window Tinting Glendale Heights",
        "NORTHERN   Schaumburg",
        "Tesla Glendale Heights",
        "Tesla Chicago",
        "Detailers Roadmap Chicago",
        "8bitcreative, LLC Chicago"
    ],
```

And now we can iterate trough the array, and use the item as a search query for google search, which will also display the google maps results with the address: `Adresă: 811 W Higgins Rd # B, Schaumburg, IL 60195, Statele Unite ale Americii`

This is the resulted text is the full address. This approach in itself can be used for the same problem, but the issue here is that sometimes, google can give the result of a company that has a very similar name and it's no what we need, so we only use it as a last resort.

All there is remaining  to do train NER models for each country and address remaining edge cases and we will end up with a very accurate address scraper that avoids wrong data, and takes only correct addresses.
### Edge Cases
No matter how many Edge Cases we try to address, there will always be more. But there are a couple we must address for our scraper to be robust.

One that seems to be the trickiest of all is deciding from which country the company is. Our scrapper depends on this so it utilizes the correct postcode. In our list we have most of the examples with correct domain extensions, .com mostly used by US companies, and .co.uk used for UK companies, and so on. But this is not always the case.

For many other cases, it is easy to establish this by guessing the language with NLP language guessers, and based on this we use the correct regex format for finding the postcode. 

We can go with a probability score for the cases of US, UK, Australia, Germany and Austria (because there are cases where Austrian links have .de). The country probability score will be calculated based on the GPE's extracted by Spacy, and decide based on that.
So on a .com page, where we get mentions of: "England", "Southampton", we can assume it's a UK company or institution, and search for the postcode with the proper regex and use a model trained for UK addresses.

There will be cases where we will have foreign mentions of, for example, business parteners, and let's say we get mentions as following: "England", "Southampton", "London", "New York". In this case, UK would have a higher score then US and we can assume it's a UK company, so we'll search for a UK address.
### Conclusion, overall results and accuracy

### Problems and improvements
While our final scraper yielded great results, it is not without problems and there is room for improvement. 

First thing we notice is cost effectiveness. Our scraper currently depends on the Zipcodebase API which brings costs at higher numbers of requests. It worked as a great tool during development, but there are a couple of solutions that will be cheaper to run.

1. We use it specifically to validate the address we find in page. Therefore, one option would be to train a model for classification, to tell whether the returned text from which our regex has found the postcode, is an address or not.

Because there will be cases where a text is an address:
`300 S Main St, Weatherford, TX 76086, United States`

But there are cases where the extracted text is not an address:
`7 Associated companies 390+ Beautiful Themes 15+ Easy Plugins 24150+ Active users`

2. An other option would be to use the databases and API's of each individual country, which can be free for access

Second thing we can improve on is the fact that we need to train individual models for each country. It's a great approach because it increases accuracy, but it can be difficult to maintain.

##### Performance 

### Sources

-  [How to parse freeform street/postal address out of text, and into components](https://stackoverflow.com/questions/11160192/how-to-parse-freeform-street-postal-address-out-of-text-and-into-components)
*  [Statistical NLP on OpenStreetMap Toward a machine-interpretable understanding of place](https://medium.com/@albarrentine/statistical-nlp-on-openstreetmap-b9d573e6cc86)
* [Named Entity Recognition for Address Extraction in Speech-to-Text Transcriptions Using Synthetic Data](https://arxiv.org/pdf/2402.05545)((1)Slovak National Supercomputing Centre, Bratislava, Slovak Republic (3)Institute of Information Engineering, Automation, and Mathematics, Slovak University of Technology in Bratislava, Slovak Republic)
* [Machine learning innovations in address matching: A practical comparison of word2vec and CRFs](https://onlinelibrary.wiley.com/doi/full/10.1111/tgis.12522)
* [Multinational Address Parsing: A Zero-Shot Evaluation](https://arxiv.org/pdf/2112.04008)