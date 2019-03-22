# Deprecated

# Checks the similarity of 2 marc records using neural network

## Installation

```

npm install marc-record-similarity

```

## Usage

```
var RecordSimilarity = require('marc-record-similarity');

var similarityChecker = new RecordSimilarity(options);

options:
	network: brain.NeuralNetwork (see [brain](https://github.com/harthur/brain))
	strategy: strategy (attributes) that were used to train the network


var res = similarity.check(record1, record2);

```
Records are expected to be in [marc-record-js](https://github.com/petuomin/marc-record-js) format.


res will be in the range [0,1], where 
 * 0 means not duplucate and 
 * 1 means that the records are a duplicate.

 ## License and copyright

 Copyright (c) 2015, 2017 **University Of Helsinki (The National Library Of Finland)**

 This project's source code is licensed under the terms of **GNU Affero General Public License Version 3** or any later version.
