# Internal update tool

This tool updates dependencies in mod projects.

## Development

The tool is developed in TypeScript and needs to be compiled before it can be executed.

Modify early parts of [`index.ts`](./src/index.ts) to ignore name patterns and certain folders.

```bash
npm install
npm run dev
```

## Using the script

### Help

```bash
node dist/index.js --help
```

### Update scripts

```bash
node dist/index.js update ../../
```

```bash
node dist/index.js update ../../ --major
```

### Test mods

```bash
node dist/index.js test ../../
```
