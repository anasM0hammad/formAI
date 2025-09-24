const { ChromaClient } = require('chromadb');

let chroma = null;

const getRandomUUID = (count) => {
    const ids = [];
    for(let i=0; i<count; i++){
        ids.push(crypto.randomUUID());
    }
    return ids;
}

const getChromaClient = () => {
    if(!chroma){
        chroma = new ChromaClient({
            host: process.env.CHROMA_HOST,
            port: process.env.CHROMA_PORT,
        });
    }
    return chroma;
}

const getCollection = async (collectionName) => {
    const chromaClient = getChromaClient();
    const collection = await chromaClient.getOrCreateCollection({ name: collectionName });
    return collection;
} 

const addDocument = async (documents, collection) => {
    const chromaClient = getChromaClient();
    await collection.upsert({
        documents,
        ids: getRandomUUID(documents.length)
    });
}

const getQuery = async (query, collectionName) => {
    const collection = await getCollection(collectionName);
    const response = await collection.query({
        queryTexts: [query],
        nResults: 5,
    });

    return response;
}

module.exports = { getChromaClient, getCollection, addDocument, getQuery };