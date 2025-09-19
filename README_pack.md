# typed-message

A library for providing type-safe internationalized messages on TypeScript + React + Vite environment.

![typed-message](images/typed-message-120-c.png)

[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

----

## What is this?

Have you ever thought that it would be nice to be able to specify strictly typed parameters when generating and outputting internationalized messages in React?

You can use Interpolation String when formatting message strings, but you can't use this because it makes it difficult to internationalize messages. On the other hand, the usual string formatting functions do not check the arguments and types given.

This package allows you to manage internationalized messages in a JSON file and specify parameters based on a type-safe definition. For example, the following message file could be prepared:

```json 
{ 
 "WELCOME_USER": "Welcome {firstName} {lastName}! Age: {age:number}", 
} 
```

You can use a React component to display this message:

```tsx
{/* The provider */}
<TypedMessageProvider messages={localeMessages[locale]}> 
  {/* Place the component that formatted string */}
  <TypedMessage 
    message={messages.WELCOME_USER} 
    params={{ firstName: "John ", lastName: "Doe", age: 25 }} /> 
</TypedMessageProvider> 
```

Moreover, the format parameter object you specify for ``params`` is typed by TypeScript, so you will never get lost or specify the wrong type for a parameter name or type.

Of course, you can also use it as a hook function instead of a React component:

```tsx
// Use message getter function
const getMessage = useTypedMessage();

// To format with the parameters
const formatted = getMessage(
  messages.WELCOME_USER,
  { firstName: "Jane", lastName: "Smith", age: 30 });
```

And if the parameter order changes depending on the locale, there is no need to make any changes to the code.
Parameter type extraction is done automatically by the Vite plugin. This means you only need to edit the message file for each locale!

### Features

- Completely Type-Safe - Compile-time validation of message keys with TypeScript
- Hot Reload Support - Automatic detection of locale file changes during development
- Automatic Fallback Message Aggregation - Specify fallback messages for when a message is not found
- Parameterized Messages - Dynamic message formatting using placeholders (type-safe)
- Vite Optimized - Automatic code generation via Vite plugin

----

## Documentation

[See the repository documentation](http://github.com/kekyo/typed-message/).

## Discussions and Pull Requests

For discussions, please refer to the [GitHub Discussions page](https://github.com/kekyo/typed-message/discussions). We have currently stopped issue-based discussions.

Pull requests are welcome! Please submit them as diffs against the `develop` branch and squashed changes before send.

## License

Under MIT.
