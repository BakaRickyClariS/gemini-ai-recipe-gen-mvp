<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# 我有辦法在vercel用swagger嗎?

是的，在Vercel上可以使用Swagger來生成和展示API文件，但需要處理靜態資源載入和路由配置的問題。[^2][^3]

## 常見挑戰

Vercel的伺服器無狀態特性常導致Swagger UI的CSS/JS檔案無法正確載入，顯示空白或樣式缺失。[^1][^8]
這在Next.js、Node.js或NestJS專案中特別常見，本地運行正常但部署後失效。[^5][^10]

## 解決方案

- **自訂Swagger UI路徑**：使用`swagger-ui-dist`套件，並在`vercel.json`中配置靜態檔案路由，例如將`/swagger/(.*)`導向`public/swagger/$1`。[^4][^2]
- **Node.js/Express範例**：安裝`swagger-ui-express`，在`app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))`，並調整options包含customCss來隱藏topbar或修復樣式。[^8][^5]
- **Next.js App Router**：使用JSDoc註解路由，或整合`@nestjs/swagger`並動態設定customCssUrl/customJs避免資源缺失。[^10][^1]


## 部署步驟

配置`vercel.json`範例：

```
{
  "rewrites": [
    { "src": "/swagger/(.*)", "dest": "/public/swagger/$1" },
    { "src": "/(.*)", "dest": "/api/index.js" }
  ]
}
```

重新部署後，訪問`/swagger`即可看到互動式API介面。[^6][^4]
<span style="display:none">[^7][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.reddit.com/r/nextjs/comments/17cvyng/how_to_use_swagger_on_nextjs_13/

[^2]: https://blog.csdn.net/gitblog_00837/article/details/151554846

[^3]: https://stackoverflow.com/questions/78102156/after-vercel-production-i-cant-view-swagger-ui

[^4]: https://github.com/vercel/vercel/discussions/10872

[^5]: https://dev.to/milan960/how-to-create-a-nodejs-server-and-add-swagger-to-a-project-and-deployed-on-vercel-cli-39a8

[^6]: https://community.vercel.com/t/deploying-an-express-app-with-swagger-ui/2707

[^7]: https://igouist.github.io/post/2021/05/newbie-4-swagger/

[^8]: https://github.com/vercel/vercel/discussions/8630

[^9]: https://israynotarray.com/nodejs/20201229/1974873838/

[^10]: https://juejin.cn/post/7436601385162260521

