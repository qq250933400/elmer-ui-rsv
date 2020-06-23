/**
 * 读取node.js运行命令参数
 * @param key 参数名称
 */
export const getArgv = (key:string): string | boolean => {
    const argv = process.argv || [];
    const isDarams = /^[\-]{1,2}/i.test(key);
    for(let i=0;i<argv.length;i++) {
        if(isDarams && argv[i] === key) {
            if(i<argv.length - 1) {
                if(/^[\-]{1,2}/i.test(argv[i + 1])) {
                    return null;
                } else {
                    i + 1;
                    return argv[i + 1];
                }
            } else {
                break;
            }
        } else {
            if(argv[i].startsWith(key + "=")) {
                return argv[i].substr(key.length + 1);
            } else if(argv[i] === key) {
                if(!/^[\-]{1,2}/i.test(argv[i-1])) {
                    return true;
                } else {
                    break;
                }
            }
        }
    }
    return undefined;
};

/**
 * 根据文件名获取文件所在目录
 * @param fileName 文件完整路径
 */
export const getFolder = (fileName: string): string => {
    const mFileName = fileName.replace(/\\/g, "/");
    return mFileName.replace(/\/[0-9a-z\-\_\+\s\.]*$/i, "");
};

