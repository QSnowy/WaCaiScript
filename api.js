
const axios = require('axios')
const dotenv = require('dotenv')
dotenv.config()

const baseURL = 'https://www.wacai.com/activity/bkk-frontier/api/'
const urlmap = {
    flows: 'v2/flow/list/web',                  // 流水
    category: 'v2/category/web/query',          // 收支分类
    books: 'v2/book/web/query',                 // 账本           
    accounts: 'account/web/query',              // 账户列表
    memebers: 'v2/book/member/web/query',       // 成员列表
    tragets: 'v2/trade/target/web/query',       // 商家列表
    hideAccounts: 'account/hiddenList',         // 隐藏账户列表
    accountFlows: 'account/detail/flow'         // 账户流水
}

function addInterceptors() {
    // 添加请求拦截器
    axios.interceptors.request.use(function (config) {
        let url = config.baseURL + config.url
        // console.info(`--------------->request: ${url}\nmethod: ${config.method}\nparams: ${JSON.stringify(config.params)}\ndata: ${JSON.stringify(config.data)}`)
        return config;
    }, function (error) {
        console.info('send request occur error ', error)
        return Promise.reject(error);
    });

    // 添加响应拦截器
    axios.interceptors.response.use(function (response) {
        let url = response.config.baseURL + response.config.url
        // console.info(`<================response url: ${url}\ndata: ${JSON.stringify(response.data)}`)
        return response.data;
    }, function (error) {
        console.error('recevie reqeust occur error ', error)
        return Promise.reject(error);
    });
}
addInterceptors()

function request(url, method, params, data) {

    let token = process.env.wacai_token
    let baseConf = {
        baseURL: baseURL,
        url,
        method,
        headers: { 'X-Access-Token': token }
    }
    let templeParams = { ...params, '___t': `${Date.now()}` }
    let requestConfig = { ...baseConf, params: templeParams, data }
    /// 发起axios请求
    return axios(requestConfig)
}
/**
 * 获取账户列表
 * @returns axios request
 */
function getAccounts() {

    return new Promise((resolve, reject) => {
        request(urlmap.accounts, 'get', { accountOption: 0 })
            .then(resp => {
                // 提取数组
                if (resp.code != 0) {
                    reject(Error(resp?.error ?? "未知错误"))
                }
                let accounts = resp.data?.accounts ?? []
                resolve(accounts)
            })
            .catch(err => {
                reject(err)
            })
    })
}

/**
 * 获取账本列表
 * @returns axios request
 */
function getBooks() {

    return new Promise((resolve, reject) => {
        request(urlmap.books, 'get', {})
            .then(resp => {
                // 提取数组
                if (resp.code != 0) {
                    reject(Error(resp?.error ?? "未知错误"))
                }
                let books = resp.data?.books ?? []
                resolve(books)
            }).catch(err => {
                reject(err)
            })
    })
}

/**
 * 获取账本指定年限内所有流水数据
 * @param {number} start 账单起始年份
 * @param {number} end 账单结束年份
 * @param {string} bookId 账本id
 * @returns promise
 */
function getBookFlows(start, end, bookId) {

    let query = generateFlowQuery(start, end, bookId)
    return new Promise((resolve, reject) => {
        request(urlmap.flows, 'post', undefined, query)
            .then(resp => {
                if (resp.code != 0) {
                    reject(Error(resp?.error ?? "未知错误"))
                }
                let data = resp?.data ?? {}
                resolve(data)
            })
            .catch(err => {
                reject(err)
            })
    })
}

/**
 * 获取账本下收入类型
 * @param {string} bookId 账本id
 * @returns 
 */
function getBookIncomeCategories(bookId) {

    return new Promise((resolve, reject) => {
        request(urlmap.category, 'get', { categoryType: 2, bkId: bookId })
            .then(resp => {
                // 提取数组
                if (resp.code != 0) {
                    reject(Error(resp?.error ?? "未知错误"))
                }
                let cates = resp.data?.bookCategories ?? []
                resolve(cates)
            }).catch(err => {
                reject(err)
            })
    })
}
/**
 * 获取账本下支出类型
 * @param {string} bookId 账本id
 * @returns 
 */
function getBookOutgoCategories(bookId) {

    return new Promise((resolve, reject) => {
        request(urlmap.category, 'get', { categoryType: 3, bkId: bookId })
            .then(resp => {
                // 提取数组
                if (resp.code != 0) {
                    reject(Error(resp?.error ?? "未知错误"))
                }
                let cates = resp.data?.bookCategories ?? []
                resolve(cates)
            }).catch(err => {
                reject(err)
            })
    })
}
/**
 * 获取账本下成员列表
 * @param {string} bookId 账本id
 * @returns 
 */
function getBookMembers(bookId) {
    return new Promise((resolve, reject) => {
        request(urlmap.memebers, 'get', { bkId: bookId })
            .then(resp => {
                // 提取数组
                if (resp.code != 0) {
                    reject(Error(resp?.error ?? "未知错误"))
                }
                let members = resp.data?.bookMembers ?? []
                resolve(members)
            }).catch(err => {
                reject(err)
            })
    })
}
/**
 * 获取账本下商户列表
 * @param {string} bookId 账本id
 * @returns 
 */
function getBookTradeTargets(bookId) {
    return new Promise((resolve, reject) => {
        request(urlmap.tragets, 'get', { bkId: bookId })
            .then(resp => {
                // 提取数组
                if (resp.code != 0) {
                    reject(Error(resp?.error ?? "未知错误"))
                }
                let trades = resp.data?.bookTradeTargets ?? []
                resolve(trades)
            }).catch(err => {
                reject(err)
            })
    })
}

function getAccountFlows(accountId, start, end) {
    let startInterval = new Date(`${start}-01-01 00:00:00`).getTime()
    let endInterval = new Date(`${end + 1}-01-01 00:00:00`).getTime() - 1
    let queryData = {
        "startDate": startInterval,
        "endDate": endInterval,
        "accountId": accountId,
        "timeZoneId": "Asia/Shanghai",
        "localTime": Date.now(),
        "queryTagName": true
    }

    return new Promise((resolve, reject) => {
        request(urlmap.accountFlows, 'post', {}, queryData)
            .then(resp => {
                if (resp.code != 0) {
                    reject(Error(resp?.error ?? "未知错误"))
                }
                let flows = resp.data?.flows ?? []
                resolve(flows)
            })
            .catch(err => {
                reject(err)
            })
    })
}

/**
 * 生成账本指定年限内所有流水接口的post参数
 * @param {number} start 账单起始年份
 * @param {number} end 账单结束年份
 * @param {string} bookId 账本id
 * @returns 参数
 */
function generateFlowQuery(start, end, bookId) {

    let yearFirstDate = new Date(`${start}-01-01 00:00:00`)
    let yearLastDate = new Date(`${end + 1}-01-01 00:00:00`)
    let startInterval = yearFirstDate.getTime()
    let endInterval = yearLastDate.getTime() - 1

    let queryData = {
        "bkId": bookId,
        "startTime": startInterval,
        "endTime": endInterval,
        "queryFlowCount": true,
        "recTypeList": null,
        "mainTypeIdList": null,
        "subTypeIdList": null,
        "accountIdList": null,
        "projectIdList": null,
        "tradetgtIdList": null,
        "memberIdList": null,
        "reimburseList": null,
        "comment": null,
        "amountStart": null,
        "amountEnd": null,
        "pageSize": 9999,
        "pageIndex": 1,
        "queryTagName": true
    }
    return queryData

}


module.exports = {
    getAccounts,
    getBooks,
    getBookFlows,
    getBookIncomeCategories,
    getBookOutgoCategories,
    getBookMembers,
    getBookTradeTargets,
    getAccountFlows
}

