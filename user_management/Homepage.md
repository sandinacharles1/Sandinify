***FRONTEND***
**Decor.jsx:**
Pudding svg
**Header.jsx:**
Add joy and whimsy and music notes!! and other parts
**Homepage.jsx:**
Imports all necessary small pre-made components
TEMPORARY: Create a JSON of Songs with the given song metadata
Return the HTML page (standard react formatting): When we implement the actual components, we add them with <Component> with their style being style={}
For the LIST of songs, we GET our data (temporary json, not from object database yet) and map each song() to the Songcard function given the .id and the song name.
**Sidebar.jsx:**
Placeholder playlists since we dont have a database. then we map EACH one of them

**Songcard.jsx**
Import style to define how the individual card looks like. the function receives a song object with the necessary columns describing it in the database (decisions decisions...SQL or NoSQL?. Probably noSQL to learn how to set up those types of non-relational databases)

**Styles.jsx**
all the css