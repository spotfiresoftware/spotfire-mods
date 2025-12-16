# ts-react

Shows how to setup the a mod project to use [React](https://react.dev/).
This is simply the starter project for visualization mods but rendererd using React.

The relevant changes from the starter project are:
- Installing React: `npm install react react-dom`.
- Installing React TypeScript typings: `npm install --save-dev @types/react @types/react-dom`.
- Adding `jsx": "react-jsx"` to `tsconfig.json`.
- Adding `jsx: "automatic"` to `esbuild.config.js`.
- Renaming `main.ts` -> `main.tsx` to enable JSX syntax.
- Adding `tsx` to `.editorconfig`.
