const dotenv = require('dotenv');
const OpenAI = require('openai');
const axios = require('axios');
const { chromium }  = require('playwright');
const { wrap, configure } = require('agentql');
const { pruneUndefined } = require('./utils');
const { addDocument, getCollection, getQuery } = require('./embedding');

dotenv.config();
configure({
    apiKey: process.env.AGENTQL_KEY,
});

const fetchFormFields = async (href, browser, additionalFields={}) => {
    const page = await wrap(await browser.newPage());
    await page.goto(href);

    const formQuery = `{
        first_name,
        last_name,
        name,
        email,
        gender,
        date_of_birth,
        address,
        city,
        state,
        zip_code,
        graduation_year,
        school,
        degree,
        current_role,
        current_company,
        current_compensation,
        applying_for_position,
        years_of_experience,
        expected_salary,
        phone_number,
        area_code,
        cover_letter,
        about,
        website,
        submit_btn,
    }`;
    
    const response = await page.queryElements(formQuery);
    return response;
}

const askLLM = async (question) => {
    const openai = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL:  process.env.BASE_URL,
    });

    const system = `You are a very helpful assistant and expert in filling application form. You have to answer to the form questions based on context provided. Only provide the answer to the question and nothing more than that. strictly return '' if you do not the know the exact answer to the question.`;

    const ragDocuments = await getQuery(question, process.env.CHROMA_COLLECTION);
    const query = ragDocuments.documents[0].join(', ');

    const response = await openai.chat.completions.create({
        model: 'gemini-2.0-flash',
        messages: [
            { role: "system", content: system},
            { role: "user", content: `Context: ${query} \n Answer the form field : ${question} for me`}
        ] 
    });
    const answer = response.choices[0].message.content?.trim();
    return answer;
}

const queryController = async (req, res, next) => {
    const body = req.body;
    if(!body){
        res.status(400).json({
            message: 'no body'
        });
        return;
    }

    const href = body.href;
    if(!href){
        res.status(400).json({
            message: 'no href'
        });
        return;
    }
    const browser = await chromium.launch({ headless: false });
    const fields = await fetchFormFields(href, browser);
    const data = await fields.toData();

    // Ask from LLM with retrieved data
    const questions = pruneUndefined(data);
    for(const key in questions){
         const answer = await askLLM(key);
    
        // Fill the form
        if(answer){
            await fields[key].type(answer);
        }
        console.log(key, answer);
    }

    await fields.submit_btn.click();
    // await browser.close();

    return res.status(200).json({
        message: 'query completed'
    });
}

const createEmbedding = async (req, res, next) => {
    const body = req.body;
    if(!body){
        res.status(400).json({
            message: 'no body'
        });
        return;
    }

    const documents = body.documents;
    if(!documents){
        res.status(400).json({
            message: 'no document'
        });
        return;
    }

    try{
        const collection = await getCollection(process.env.CHROMA_COLLECTION);
        await addDocument(documents, collection);
        return res.status(200).json({
            message: 'document added succesfully'
        });
    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            message: 'server error'
        });
    }

}

module.exports = { queryController, createEmbedding };
// "href": "https://templates-demo.formbold.com/html-application-form",