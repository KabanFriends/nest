> [!CAUTION]
> Nest is under development!  
> It can run most NROM games, although with 3-4 FPS on average. Optimizations are planned after the basic implementation completes.  
> Also, the required client-side resource pack is not included in the repository yet.

# 🪺 Nest
Nest is an NES (Nintendo Entertainment System) emulator written in [Terracotta](https://owlfroggy.github.io/terracotta-docs/), a programming language that compiles into the block code for the [DiamondFire](https://mcdiamondfire.com/) Minecraft server.

The implementation of this emulator is heavily inspired by [Writing NES Emulator in Rust](https://bugzmanov.github.io/nes_ebook/).

## Project Goals
- Emulation of the built-in hardware of NES (6502-based CPU & PPU)
- Running officially licensed Mapper 0 (NROM) games
- Streaming the CHR-ROM ane PPU tables to Minecraft client which receives and renders the data using custom resource pack shaders
- Basic NES controller inputs
- Multiple sessions to run emulations simultaneously for more than 1 player

## Compiling / Deployment

### Requirements
To use Nest's development environment, we recommend installing [Docker](https://www.docker.com/) and [Visual Studio Code](https://code.visualstudio.com/). Open the project in Dev Container and it will automatically set up the required tools to start the development. Specifically, these tools will be set up:
- [Terracotta VSCode Extension](https://marketplace.visualstudio.com/items?itemName=Owlfroggy.terracotta) (contains the Terracotta compiler)
- [Node.js](https://nodejs.org/) (for pre-processing macros)

We recommend following plot specs on DiamondFire to run Nest:
- Plot: Large Plot (100)
- Node: Private Node
  - You can still use regular nodes, but for now it will not perform well due to LagSlayer limits

### Compiling Guide
TODO

