*Frontend*
**Connection Between Files**
package.json: Project setup, tells how to run the webapp
index.html: Browser Page
Main.jsx: Tells React where to render, makes react into the page
App.jsx: Actual Content
**package.json**
1. Includes Metadata (name, privacy to not publish, version, module type to use import )
2. Includes scripts (dev, tp start development server for preview, build, to compress code to upload whenn done, and preview, to locally test)
3. Have dependiciees required to run (react, and reaxct dom)
4. devDependnencies required to build
**Index.html**
1. Initialize doctype and meta-data for the website
2. Initialize "root" div (where React will edit) in body
**src/main.jsx**
1. Import React engine 
2. Import React DOM for websites
3. Import Our app
4. Look for root div and allow to start rendering
5. Initialize Strict Mode to help easily find bugs
6. Calls main component
**src/App.jsx**
1. Import React tools with proper syntax import { toolName } from 'libraryName'; 
Understand key tools: 'useState' is used to store & update data.

2. Define the state of our objects. Our sign-in box, and our log-in box.
Syntax: const [varName, setterFunc] = useState(initialValue); Later on in the html, we do htmlFor the variable we set and onchange, we get the changed value and set the username to its value

3 & 6. Handler functions. What to do when input / state is changed. We send a HTTPS POST request to the DNS Global Routing layer with our information as a json.

7. Include the HTML file as you'd do, and the CSS

Future goals: Download https url with Tunnelmole: https://softwareengineeringstandard.com/2025/08/16/localhost-httpss/

*Backend*