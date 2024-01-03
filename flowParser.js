const Tools = require('./tools')

// 支出大类 列表
var mainOutgoCategories = []
// 支出小类 列表
var subOutgoCategories = []
var bookAccounts = []
var currentBook = null

const typeMap = { '1': '支出', '2': '收入', '3': '转账', '4': '借贷', '5': '借贷' }

/**
 * 解析账单json数据为指定格式的数组
 * @param {object} book 账本
 * @param {object} respData 账单json
 * @param {string} expType 账单导出格式 xiaoxing qianji 两个平台格式 默认小星格式
 * @returns 流水数组
 */
function parseBookFlowResponse(book, respData, expType = 'xiaoxing') {

    prepare(book)

    try {
        const dailyItems = respData?.dailyItems
        let flowArray = []
        dailyItems.forEach(daily => {
            let dailyFlowList = daily['flowList']
            dailyFlowList.forEach(flow => {
                let csvitem = parseFlow(flow, expType)
                flowArray.push(csvitem)
            })
        });
        return flowArray
    } catch (error) {
        console.error(`read json file occur error => ${error}`)
        return []
    }
}

/**
 * 解析数据前的基本数据
 * @param {object} book 账本
 */
function prepare(book) {
    currentBook = book
    bookAccounts = global.accounts
    mainOutgoCategories = global.categoryMap[book.id]
    mainOutgoCategories.forEach(main => {
        let subArr = main.outgoSubTypes
        if (subArr?.length > 0) {
            subOutgoCategories = subOutgoCategories.concat(subArr)
        }
    })
}

function parseFlow(flow, expType = 'xiaoxing') {

    /* 流水时间 */
    let millseconds = flow['bizTime']
    let time = Tools.formatTimeString(millseconds)

    /* 流水金额 */
    let amount = flow.amount / 100

    /* 流水备注 */
    let comment = flow['comment']

    /* 流水关联成员 */
    let members = flow.members
    let memberNames = []
    if (members != undefined) {
        memberNames = members.map(mem => mem?.name ?? '')
    }

    /* 流水标签 */
    let tags = flow.tags
    let tagNames = []
    if (tags != undefined) {
        tagNames = tags.map(t => t?.name ?? '')
    }

    /* 币种 */
    let currency = flow.currencyShortName

    /* 商家 */
    let tradetgtName = flow.tradetgtName
    if (tradetgtName == undefined) {
        tradetgtName = ''
    }
    
    /* 报销 */
    let reimburse = flow.reimburse
    let reimburseTxt = ''
    if (reimburse == 1) {
        reimburseTxt = '待报销'
    }else if (reimburse == 2) {
        reimburseTxt = '已报销'
    }

    // 类型明细
    /*             收款    还款    借出    借入    支出    收入    转账
     * recType:     5       5       4       4     1       2       3       
     * recSubtype:  0       1       1       0
     * flag:        3       3       0       0
     */
    let recType = flow['recType']
    // 大类名称
    let mainCateName = ''
    // 小类名称
    let subCateName = flow.categoryName
    // 详细的类别id
    let subCateid = flow.categoryId

    // 收支类型 支出、收入、借贷、转账
    let typeName = typeMap[recType]
    if (recType == 4 || recType == 5) {
        mainCateName = '借贷'
    } else if (recType == 1) {
        // 支出类型，找一下所属大类
        let subCate = subOutgoCategories.find(sub => sub.categoryId == subCateid)
        if (subCate != undefined) {
            let pid = subCate.parentId
            let mainCate = mainOutgoCategories.find(main => main.categoryId == pid)
            if (mainCate == undefined) {
                console.log(`账本：${currentBook.name}中未找到类目的主类：${subCateName} 时间：${time} ${JSON.stringify(flow)}`)
            }else {
                mainCateName = mainCate?.name ?? ''
            }
        }else {
            // 未找到支出子类，它本身就是主类
            mainCateName = subCateName
        }
    }

    /* 账户信息 */
    let accountId = flow['accountId']
    let account1Name = getAccountNameFor(bookAccounts, accountId)

    // 转账或借贷时的转入账户
    let account2Name = ''
    if (recType == 3) {
        // 转账类型
        let targetId = flow['targetId']
        account2Name = getAccountNameFor(bookAccounts, targetId)
    }

    // 小星记账 [类型   日期	大类	小类	金额	账户	账户2	报销	备注	图片	角色	标签	币种	商家]
    // 类型：支出、收入、转账、借贷
    if (subCateName == '借出' || subCateName == '还款') {
        // 交换 account1Name 和 account2Name
        let templ = account2Name
        account2Name = account1Name
        account1Name = templ
    }

    if (expType == 'xiaoxing') {
        let xiaoxingItem = {
            '类型': typeName, '日期': time, '大类': mainCateName, '小类': subCateName, '金额': amount,
            '账户': account1Name, '账户2': account2Name,
            '报销': reimburseTxt, '备注': comment, '图片': '', '角色': memberNames.join(' '),
            '标签': tagNames.join(' '), '币种': currency, '商家': tradetgtName
        }
        return xiaoxingItem
    }
    // 钱迹记账 [时间	分类	类型	金额	账户1	账户2	备注	账单标记	账单图片]
    // 分类：二级分类或大类  类型：收入、支出、报销、转账、还款

    let qianjiItem = {
        '时间': time, '类型': typeName, '分类': subCateName, '金额': amount,
        '账户1': account1Name, '账户2': account2Name,
        '备注': comment, '账单标记': '', '账单图片': ''
    }
    return qianjiItem

}

function trimAccountName(name) {
    let accountName = name
    accountName = accountName.replace('（', '')
    accountName = accountName.replace('）', '')
    accountName = accountName.replace('，', '')
    accountName = accountName.replace('CNY', '')
    return accountName
}

function getAccountNameFor(accounts, accountId) {
    let account = accounts.find(ac => ac.uuid == accountId)
    // 防止未找到账户名
    let name = accountId
    if (account != undefined) {
        name = account?.name ?? ''
        name = trimAccountName(name)
    } else {
        console.log(`未能找到账户的名字 => ${accountId}`)
    }
    return name
}


module.exports = {
    parseBookFlowResponse
}


