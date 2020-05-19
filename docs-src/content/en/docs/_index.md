
---
title: "Documentation"
linkTitle: "Documentation"
weight: 20
menu:
  main:
    weight: 20
---

# Developing a mod
To develop and test a mod you need a running instance of Spotfire. Development can be done against the Windows client or the Web client.

## Prerequisites
While a mod does not strictly depend on any external tools to work, there are a few tools that are highly recommended to make the development workflow smooth. It is highly recommended to use Visual Studio Code when developing a mod. The mod example include predefined settings for VS Code that enable a default build task, intellisense in the mod manifest and intellisense in the JavaScript code.

> To enable live updates when developing a mod, a set of tools based on Node.js are needed. The mod example specifies a set of development dependencies in its package.json file. These are installed when executing npm install in the same directory as the package.json file. The install script is also executed as part of the default build task in VS Code.

