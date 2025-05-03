# Pysäkil
Website is running at https://pysakil.akaseli.dev/

Shows [Föli](https://www.foli.fi/) bus stop and vehicle information. 

Frontend using React. Map is self-hosted vector tiles created using [OpenMapTiles](https://openmaptiles.org/) from [OpenStreetMap](https://www.openstreetmap.org/) data. Backend using Express and Socket.io. Mainly used for caching and some processing of vehicle live locations. 

Data source:
Turku region public transport's transit and timetable data. The administrator of data is Turku region public transport. Dataset is downloaded from http://data.foli.fi/ using the license Creative Commons Attribution 4.0 International (CC BY 4.0).
