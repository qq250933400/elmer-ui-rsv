export type TypeStartServerOptions = {
    htmlCode: string;
    htmlCodeFromFile?: boolean;
    rootId?: string;
    config: {
        source?: string;  // config build source
    },
    handler?: any;
};

export type TypeConfigSourceContent = {
    cssList: string[];
    jsList: string[];
    path: string;
};
