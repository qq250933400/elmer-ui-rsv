const location = {
    href: "http://localhost",
    hash: "",
    query: ""
};
global.window = {
    location: location,
    history: {}
};
global.location = location;
global.history = {};
global.document = {
    documentElement: null
};
global.localStorage = null;
global.defineOnWindows = false;
global.elmerData = {
    components: {},
    classPool: [],
    objPool: {},
    elmerState: {}
};
