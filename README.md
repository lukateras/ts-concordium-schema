# Concordium Schema

Node.js TypeScript library for deserializing [Concordium](https://github.com/Concordium) contract schemas.

Fully compatible with [`concordium-std::schema` v2.0.0](https://docs.rs/concordium-std/2.0.0/concordium_std/schema/index.html).

This project has been commissioned by [Blocktech.dk](https://www.blocktech.dk).

## Documentation

You can read the latest documentation at <https://redesigned-sniffle-7c4ef811.pages.github.io>.

## Installation

This NPM package is privately published using [GitHub Packages](https://github.com/features/packages).

To install it for use with your NPM project, first associate `@transumption`
package scope with GitHub Packages NPM registry:

```sh
$ npm config --userconfig .npmrc set @transumption:registry https://npm.pkg.github.com
```

Next, authenticate with the NPM registry. You will have to enter your GitHub
username, personal access token with `repo` and `read:packages` access scopes
([get one here](https://github.com/settings/tokens)), and public email address.

```sh
$ npm login --scope=@transumption --registry=https://npm.pkg.github.com
Username: <GitHub username>
Password: <GitHub token>
Email: <GitHub public email address>
```

And finally, add the NPM package to `package.json`:

```sh
$ npm install --save @transumption/concordium-schema
```

## Usage

Here's how you can deserialize a Concordium contract schema module file:

```ts
import * as fs from 'fs';
import { deserialModule } from '@transumption/concordium-schema';

const stream = fs.createReadStream('schema.bin');

stream.on('readable', () => {
    const schema = deserialModule(stream);

    // ...

    stream.destroy();
});
```

This package's type definitions closely follow the Rust implementation.
If you are familiar with `concordium_std` crate, you will feel right at home :)

Functions starting with `deserial` accept a Node.js [Readable][] stream as the
only parameter, and return a value of the type that comes after `deserial`
(for example, `deserialModule` returns a `Module`).

I recommend looking at the [documentation](#documentation) if you get stuck!

[Readable]: https://nodejs.org/api/stream.html#class-streamreadable
