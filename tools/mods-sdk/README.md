# Mods SDK

This project contains the mods-sdk tool, a CLI tool which helps in setting up and building mods.
The build system utilized by this tool is opinionated and deviating from the pre-defined template is not supported.
If you have a use-case which this build system does not cover, please open an issue.

## Functionality

The mods SDK contains a number of different CLI verbs to aid you in developing mods.
These are designed to be run from the command line and can be easily integrated into development environments such as Visual Studio Code.
For more info see sections below or run `npx @spotfire/mods-sdk --help`.

### Create a Template

To create a Script Mods project run `npx @spotfire/mods-sdk new script` in an empty directory and following the instructions output in your terminal or in the generated README.md.
