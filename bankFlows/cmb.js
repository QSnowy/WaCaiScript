const fs = require('fs')
const pdfParse = require('pdf-parse')

const Tools = require('../tools')



const parsePDF2CSV = async (filename) => {
    let filePath = `./${filename}.pdf`
    let readFileSync = fs.readFileSync(filePath)
    try {
        let pdfExtract = await pdfParse(readFileSync)
        let totalPages = pdfExtract.numpages
        let contentText = pdfExtract.text
        let array = contentText.split('\n')
        let flows = []
        let flowItemIdx = -1
        let flowItemTxt = ''
        // 无效的流水内容
        const excludeItems = ['记账日期货币交易金额联机余额交易摘要对手信息', 'DateCurrency', 'Transaction', 'Amount', 'BalanceTransaction TypeCounter Party',
            '—————————————————————————————————————————————————————', '温馨提示：',
            '1.交易流水验真：进入一网通首页（www.cmbchina.com）点击“在线服务-交易流水验真”进入页面正确录入“基本项”',
            '和“明细项”信息，点击“查询”提交系统验真。',]
        for (let i = 0; i < array.length; i++) {
            let item = array[i]
            // 提取一条完整的流水信息
            if (item.includes('CNY')) {
                if (flowItemTxt != '') {
                    // 添加上一条flow
                    // flows.push(flowItemTxt)
                    let flowItem = splitFlow(flowItemTxt)
                    flows.push(flowItem)
                }
                flowItemTxt = ''
                flowItemIdx = i
                flowItemTxt = flowItemTxt + item
            } else if (flowItemIdx < i && flowItemIdx > -1 && !excludeItems.includes(item) && !item.includes(`/${totalPages}`)) {
                // 流水后续，
                flowItemTxt = flowItemTxt + item
            }
            if (i == array.length - 1) {
                // flows.push(flowItemTxt)
                let flowItem = splitFlow(flowItemTxt)
                flows.push(flowItem)
            }
        }
        // 拿到流水array，转化为csv
        let csvFileName = `${filename}`
        let csvstr = Tools.json2CSV(flows)
        Tools.writeCSV(csvFileName, csvstr)

    } catch (error) {
        throw new Error(error)
    }
}


const splitFlow = function (originFlowTxt) {

    // 提取日期
    let dateStr = originFlowTxt.substring(0, 10)
    // 后续： CNY...
    let prefix = originFlowTxt.substring(10)
    // 提取货币
    let currency = prefix.substring(0, 3)
    // 后续：交易金额+余额...
    prefix = prefix.substring(3)
    
    // 提取交易金额和余额
    let outDotIdx = prefix.indexOf('.')
    let outAmountEndIdx = outDotIdx + 2
    let yueAmountStartIdx = outAmountEndIdx + 1
    let yueDotIdx = prefix.indexOf('.', outDotIdx + 1)
    let yueAmountEndIdx = yueDotIdx + 2
    // 交易金额
    let amount = prefix.substring(0, outAmountEndIdx + 1)
    // 账户余额
    let balance = prefix.substring(yueAmountStartIdx, yueAmountEndIdx + 1)
    // 后续：交易类型和信息
    prefix = prefix.substring(yueAmountEndIdx + 1)

    const transactionTypeKeys = ['支付', '款项', '工资', '奖金', '结息', '消费', '退款', 
    '冲补账处理', '业务付款', '代付', '取款', '自动转存', '存款', '赎回', '分红', 
    '代发劳务费', '红包', '申购', '开户', '汇款', '收款', '还款', '转存', '支取', '转出活期', '医保']
    let transactionType = ''
    let counterInfo = ''

    for (let i = 0; i < transactionTypeKeys.length; i ++) {
        let key = transactionTypeKeys[i]
        let matchIdx = prefix.indexOf(key)
        if (matchIdx > -1) {
            // 交易类型
            transactionType = prefix.substring(0, matchIdx + key.length)
            // 对手信息
            counterInfo = prefix.substring(matchIdx + key.length)
            break
        }
    }

    if (transactionType == '') {
        console.log('没找到匹配的交易类型',  dateStr, prefix)
    }

    let flowItem = {'日期': dateStr, '金额': amount, '余额': balance, '摘要': transactionType, '对方信息': counterInfo}
    return flowItem
}

function exportAllPdf() {

    for (let i = 2017; i < 2023; i ++) {
        let pdfFilePath = `CMB_${i}_${i+1}`
        parsePDF2CSV(pdfFilePath)

    }
}

exportAllPdf()
