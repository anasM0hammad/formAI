const pruneUndefined = (object) => {
    const newObj = {};
    for(const key in object){
        if(key && object[key]){
            newObj[key] = object[key];
        }
    }
    return newObj;
};

module.exports = { pruneUndefined };