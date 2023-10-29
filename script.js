const url_bicis_totales = 'https://acoruna.publicbikesystem.net/customer/gbfs/v2/en/system_information';
const url_info_estaciones = 'https://api.citybik.es/v2/networks/bicicorunha?fields=stations';
const url_coruna_offcial = "https://acoruna.publicbikesystem.net/customer/ube/gbfs/v1/en/station_status";

// Request para saber el numero total de bicicletas
fetch(url_bicis_totales)
  .then(response => response.json())
  .then(data => {
    const bicis_electricas_totales = data.data._vehicle_count._mechanical_count;
    const bicis_mecanicas_totales = data.data._vehicle_count._ebike_count;
    const info_total_bicis = "Electricas: " + bicis_electricas_totales + " \nMecanicas: " + bicis_mecanicas_totales;
    document.getElementById('data1').textContent = info_total_bicis;
});

function actualizarTabla(){
  const tableBody = document.querySelector("#data2 tbody");
  
  // Doble request para obtener los datos
  Promise.all([fetch(url_info_estaciones), fetch(url_coruna_offcial)])
    .then(responses => Promise.all(responses.map(response => response.json())))
    .then(data => {
      const info_estaciones = data[0].network.stations;
      const coruna_offcial = data[1].data.stations;

      var objeto_estaciones = coruna_offcial
        .map(corunaStation => {
          const stationId = corunaStation.station_id;
          const infoEstacion = info_estaciones.find(infoStation => infoStation.extra.uid === stationId);
          if (infoEstacion) {
            return {
              ...corunaStation,
              name: infoEstacion.name
            };
          }
          return null;
        })
        .filter(station => station !== null);
      
      // Una vez obtenidos los datos, se borra la tabla y se usa mostrar_tabla() para mostrar los datos
      while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
      }
        //console.log(objeto_estaciones);
      mostrar_tabla(objeto_estaciones);
      
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

  
function mostrar_tabla(objeto_estaciones) {
  const tableBody = document.querySelector("#data2 tbody");

  objeto_estaciones.forEach((objeto_estaciones) => {
    var num_total_docks = objeto_estaciones.num_bikes_available + objeto_estaciones.num_docks_available;
    var porcentaje_bicis = objeto_estaciones.num_bikes_available / num_total_docks * 100;
    var porcentaje_bicis_str = "\t(" + porcentaje_bicis.toFixed(2) + " %)";
    var porcentaje_bicis_formato = objeto_estaciones.num_bikes_available + "/" + num_total_docks + "<span style='color:grey;'>" + porcentaje_bicis_str + "</span>";

    var hue = (porcentaje_bicis / 100) * 120;
    var backgroundColor = `hsla(${hue}, 100%, 50%, 0.7)`; // 0.8 es la opacidad
    
    // para el unix
    let unix_timestamp = objeto_estaciones.last_reported;
    var date = new Date(unix_timestamp * 1000);
    var reported_time = date.toLocaleTimeString("it-IT");

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${objeto_estaciones.name}</strong></td>
      <td>${objeto_estaciones.num_bikes_available === 0 ? "No" : "Sí"}</td>
      <td>${objeto_estaciones.num_bikes_available_types.ebike}</td>
      <td>${objeto_estaciones.num_bikes_available_types.mechanical}</td>
      <td style="background-color: ${backgroundColor}">${porcentaje_bicis_formato}</td>
      <td>${objeto_estaciones.is_renting ? "Sí" : "No"}</td>
      <td>${objeto_estaciones.num_bikes_disabled}</td>
      <td>${objeto_estaciones.num_docks_disabled}</td>
      <td>${objeto_estaciones.status}</td>
      <td>${reported_time}</td>
    `;

    if (objeto_estaciones.num_bikes_available !== 0) {
      row.querySelector('td:nth-child(2)').classList.add('bikes-yes');
    } else {
      row.querySelector('td:nth-child(2)').classList.add('bikes-no');
    }

    tableBody.appendChild(row);
  });
}


actualizarTabla() // Primer frame
setInterval(actualizarTabla, 5500); // Actualizacion de la tabla (loop)