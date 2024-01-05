const fs = require('fs')
const path = require('path')
const Api = require('./api')
const FlowParser = require('./flowParser')
const Tools = require('./tools')

/**
 * 获取账本信息：账户和账本列表
 */
async function fetchBaseInfo() {

    let accountsApi = Api.getAccounts()
    let booksApi = Api.getBooks()

    try {
        const allrespons = await Promise.all([accountsApi, booksApi])
        global.accounts = allrespons[0]
        global.books = allrespons[1]
        global.books.forEach(b => {
            createBookDirectory(b)
        })
    } catch (error) {
        console.error('fetch base info occur error ', error)
    }
}

function createBookDirectory(book) {
    let bookDir = bookDirFor(book)
    if (!fs.existsSync(bookDir)) {
        fs.mkdirSync(bookDir, { recursive: true })
    } else {
        // 删除账本文件夹中所有文件
        fs.readdirSync(bookDir).forEach(f => {
            let fpath = path.join(bookDir, f)
            fs.unlinkSync(fpath)
        })
    }
}
/**
 * 账本导出文件夹路径
 * @param {string} book 账本
 * @returns 
 */
function bookDirFor(book) {
    return path.join(__dirname, 'outputs', book.name)
}

async function fetchBookAllFlows(book) {

    try {
        // 获取账本的支出大类小类数据，并写入global
        const bookCates = await Api.getBookOutgoCategories(book.id)
        if (global.categoryMap == undefined) {
            global.categoryMap = {}
        }
        global.categoryMap[book.id] = bookCates
        // 账本创建的时间 -> 现在时间
        let start = new Date(book.createdTime).getFullYear()
        let end = new Date().getFullYear()
        for (let i = start; i <= end; i++) {
            const flowData = await Api.getBookFlows(i, i, book.id)
            /// 解析流水数据，指定解析后的数据格式，默认为小星记账格式
            let csvData = FlowParser.parseBookFlowResp2CSVDataArr(book, flowData, 'xiaoxing')
            // 流水数据写入到本地csv文件 csv名称格式: [year]_[flowCount]_flow.csv
            let bookDir = bookDirFor(book)
            let csvFilePath = path.join(bookDir, `${i}_${csvData.length}_flow.csv`)
            // 如果是小星格式，将utf-8改为GBK或GB18030
            Tools.saveJsonArrayInCSVFile(csvFilePath, csvData, 'utf-8')
            if (i == end) {
                // csv文件转为xlsx文件
                Tools.batchCsv2XlsInDir(bookDir)
            }
        }
    } catch (error) {
        console.error(`fetch book ${book.name} all flows occur error ${error}`)
    }
}

/**
 * 保存挖财账号下所有流水记录，保存为csv和xlsx文件
 */
async function saveBookFlows() {

    await fetchBaseInfo()

    let books = global.books
    for (let i = 0; i < books.length; i++) {
        let book = books[i]
        await fetchBookAllFlows(book)
        // 合并账本所有csv文件为一个excel文件
        let bookDir = bookDirFor(book)
        Tools.mergeExcelInDir(bookDir)
    }
}

saveBookFlows()



