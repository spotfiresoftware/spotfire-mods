# Docs Generation 
TIBCO LABS

## Tooling

Tooling website and docs, [here.](https://gohugo.io/)

## Running the website locally

Once you've cloned the site repo, run the following to test the Site:

```
cd docs-src
hugo serve
```

## build the website for public

Once you've cloned the site repo, run the following to test the Site:

```
cd docs-src
set HUGO_ENV=production
hugo
```

Push  new generated 'docs' folder and update 'docs-src' folder to GitHub.

> remember the GH pages Site will just contain everything under the 'docs' folder.
