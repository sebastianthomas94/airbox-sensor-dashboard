# Problem Statement

I have an airbox api that fetches data from a sensor.

***https://airbox.edimaxcloud.com/api/tk/query_now?token=5f669da6-5552-4148-8306-ae149e91b171***

## Sample Response

```json
{
  "status": "ok",
  "entries": [
    {
      "area": "",
      "co": 0,
      "co2": 0,
      "name": "airdxb",
      "fw_ver": "1.0.9",
      "lat": 25.0104822,
      "lon": 55.4510435,
      "h": 60,
      "hcho": 0,
      "mac": "08BEAC45EA22",
      "model": "",
      "odm": "edimax",
      "pm1": 21,
      "pm10": 40,
      "pm25": 34,
      "t": 18.87,
      "tvoc": 0,
      "type": "airbox",
      "time": "2025-11-17T15:32:45+08:00",
      "status": "online",
      "adf_status": 0
    }
  ],
  "exclusion": null,
  "total": 1
}
```
I want you to create a server and a webpage as a dashboard to display the history of these values in a informative and helpful way. The server should periodically fetch data from the airbox API and store it in a database. The webpage should display the historical data using charts and graphs for better visualization. I am not sure what these values represent, so please do your research and find what these values are and display them accordingly.

***DB url: ```mongodb+srv://kelvinthomas84_db_user:66VRlMY1dJ77TZqP@cluster0.uhr4gei.mongodb.net```***

# Instructions

- Periodically fetch data api and store it as document in MongoDB database.
- Create an express server to serve the webpage.
- make db url and token as environment variables.
- there should be a input box to change the token from the webpage dynamically, along with FETCH_INTERVAL_MINUTES.
- use typescript for server and html frontend(use required styling libraries if needed).
- Use the best available charting library to display the historical data.
- use repository pattern for database operations.
- Use MVC architecture for the server.
- Keep it simple and clean.