var breadcrumb = require("./breadcrumb")(hexo);
var removeContent = require("./removeContent")(hexo);
var replaceContent = require("./replaceContent")(hexo);
var tableOfContent = require("./tableOfContent")(hexo);

hexo.extend.helper.register("breadcrumb", breadcrumb, { async: true });
hexo.extend.helper.register("removeContent", removeContent, { async: true });
hexo.extend.helper.register("replaceContent", replaceContent, { async: true });
hexo.extend.helper.register("tableOfContent", tableOfContent, { async: true });
