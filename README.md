# Sandinify

**Sandinify** is a personal project I'm building to learn how backend systems and system design work. It is a music application heavily inspired by Spotify, but with a unique twist that lets you analyze the actual frequencies of a song and find matching books!

---

## System Design Whiteboard (opens Drawio diagram)

https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&highlight=0000ff&edit=_blank&layers=1&nav=1&title=Music%20music%20MUSIC.drawio&dark=0#Uhttps%3A%2F%2Fdrive.google.com%2Fuc%3Fid%3D12FPy8qU-1mB83VXN_FH-Q3BzmRCVQ7qT%26export%3Ddownload


## Main Features

### 1. The Core Music App (Like Spotify)
*   **Users & Playlists:** Create an account, make and share playlists, and add songs.
*   **Music Streaming:** Upload songs and stream them directly in the app.

### 2. Audio Frequency Splitting
*   **Song Analysis:** When a song is uploaded, the backend breaks down the audio into different frequencies, and later on, differrent components (Bass, Treble, etc.).
*   **Fast Fourier Transform (FFT):** Use the FFT math concept to split up these frequencies.
*   **Visualizer:** See the amplitude (volume/strength) of each component compared side-by-side so you can visually see the song's makeup.

### 3. Book Recommendations by "Vibe"
*   **Music to Books:** The system looks at the overall frequency and pattern of a song to determine its "vibe."Based on that vibe, the app will suggest books that match the mood of the music you are listening to.
*   **Books to Music:** Ability to understand the genre of a book and return matching playlists
---

##  The languages, frameworks, and tools I plan to use (subject to change)
*   React: For frontend 
*   Java: For core backend services like api endpoints 
*   Go: For rate limiting nad audio streaming
*   Redis: For caching
*   PostgreSQL: For databses
*   Python: For Audio Analysis
*   Docker & Kubernetes to maintain and run multiple containers
*   
# User Management System Architecture Implementation Blueprint

This guide breaks down the step-by-step implementation requirements for a secure, scalable user management system, analyzing both high-level infrastructure layouts and low-level data flows.

### User Workflows & Core Services Implementation
* **Signup & Login Flow:** Build an **Auth Service** utilizing **Java Spring** for the backend. Ensure passwords sent via HTTPS requests are securely hashed using **ARGON2ID** before checking or inserting records into the **PostgreSQL** database.
* **Token-Based Authentication:** Configure successful authentication to yield **JWT / OAuth 2.0 tokens**, returning an Access Token to the client alongside a securely managed Refresh Token.
* **Account Deletion:** Handle deletion actions directly within dedicated endpoints by executing structured `DELETE FROM table_name WHERE...` database queries.

### Infrastructure & Traffic Management (Reducing SPOF)
* **Global Routing & Balancing:** Set up a **DNS Global Routing Layer** to seamlessly direct traffic to region-based **Load Balancers** and choose the optimal server.
* **API Gateway & Security:** Implement strict **Rate Limiting** via an API Gateway backed by a **Redis Cache** to protect endpoints from abuse and DDoS attempts.
* **High Availability:** Mitigate Single Points of Failure (SPOF) by deploying **Multiple Load Balancers** coupled with an infrastructure health checker to automatically handle failovers and spin up backup instances.

### Networking Protocol Requirements
* **High-Level (Application Layer):** Standardize on encrypted **HTTPS** for all client-to-API communication across the open internet to guarantee data privacy.
* **Low-Level (Transport Layer):** Choose **TCP ** over UDP because system actions like user authentication require 100% data accuracy and cannot risk packet loss. Leverage the reliable **Three-Way Handshake (SYN, SYN-ACK, ACK)** connection stream on the server and client sides, while letting the underlying framework/libraries handle abstraction.
