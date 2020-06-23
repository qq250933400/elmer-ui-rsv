import { Common } from "elmer-common";
import superAgent, { agent, SuperAgentStatic } from "superagent";

export type TypeHttpResonse = superAgent.Response & {};
export type TypeHttpPostRequest = {
    url: string;
    data?: any;
    dataType?: string;
    accept?: any;
    query?: string;
    uri?: string;
};
export default class HttpHelper extends Common {
    private http:SuperAgentStatic;
    constructor() {
        super();
        this.http = agent();
    }
    get(url: string):Promise<TypeHttpResonse> {
        return new Promise<TypeHttpResonse>((resolve, reject) => {
            // tslint:disable-next-line: no-floating-promises
            this.http.get(url).then((resp: superAgent.Response) => {
                if(resp.status === 200) {
                    resolve(resp);
                } else {
                    reject(resp);
                }
            }).catch((reson:any) => {
                reject(reson);
            });
        });
    }
    post(params: TypeHttpPostRequest): Promise<TypeHttpResonse> {
        return new Promise<TypeHttpResonse>((resolve, reject) => {
            // tslint:disable-next-line: no-floating-promises
            this.http.post(params.url)
            .type(params.dataType || "application/json")
            .query(params.query || "")
            .query(params.uri || {})
            .accept(params.accept || "json")
            .send(params.data || {})
            .then((resp: superAgent.Response) => {
                if(resp.status === 200) {
                    resolve(resp);
                } else {
                    reject(resp);
                }
            }).catch((reson:any) => {
                reject({
                    status: reson.status,
                    statusText: reson.statusType,
                    message: reson.message + "[" + reson.status + "]",
                    srcMessage: reson.message
                });
            });
        });
    }
}
