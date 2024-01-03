## 获取挖财记账所有流水数据
将挖财账号下的所有流水，导出为csv和xlsx文件。csv格式目前默认是小星记账导出格式，也可指定钱迹导出格式。

1. 获取挖财账号token，网页登录账号：https://www.wacai.com/
2. 网页登录账号后，打开浏览器开发者工具，复制cookies中`access_token`的token值
3. 创建.env文件，文件中写入`wacai_token=<token值>`
4. 安装依赖 `npm install` 或 `yarn`
5. 终端执行 `node index.js`

指定导出csv数据格式，修改index.js文件以下位置代码
```javascript
// 最后一个参数 为xiaoxing和qianji 小星记账和钱迹
FlowParser.parseBookFlowResponse(book, flowData, 'xiaoxing')
```

如果不需要xlsx文件，注释掉以下代码
```javascript
Tools.batchCsv2XlsInDir(bookDir)
Tools.mergeExcelInDir(bookDir)

```