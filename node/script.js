const url_bicis_totales = 'https://acoruna.publicbikesystem.net/customer/gbfs/v2/en/system_information';
const url_info_estaciones = 'https://api.citybik.es/v2/networks/bicicorunha?fields=stations';
const url_coruna_offcial = "https://acoruna.publicbikesystem.net/customer/ube/gbfs/v1/en/station_status";

let chartInstance = null; // Variable global para almacenar la instancia del gráfico

// Request para saber el número total de bicicletas
function uso_total() {
  return fetch(url_bicis_totales)
    .then(response => response.json())
    .then(data => {
      const bicis_electricas_totales = data.data._vehicle_count._ebike_count;
      const bicis_mecanicas_totales = data.data._vehicle_count._mechanical_count;
      const bicicletas_totales = bicis_electricas_totales + bicis_mecanicas_totales;
      return { bicis_electricas_totales, bicis_mecanicas_totales, bicicletas_totales };
    });
}

function actualizarTabla() {
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

      // Borrar la tabla
      while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
      }

      mostrar_tabla(objeto_estaciones);
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

function mostrar_tabla(objeto_estaciones) {
  const tableBody = document.querySelector("#data2 tbody");
  let bicicletas_en_uso = 0;
  let data_estaciones = {
    max: [],
    min: [],
    llenas: [],
    vacias: []
  };

  objeto_estaciones.forEach((objeto_estaciones) => {
    bicicletas_en_uso += objeto_estaciones.num_bikes_available;

    var num_total_docks = objeto_estaciones.num_bikes_available + objeto_estaciones.num_docks_available;
    var porcentaje_bicis = objeto_estaciones.num_bikes_available / num_total_docks * 100;
    if (porcentaje_bicis === 0) {
      data_estaciones.vacias.push(objeto_estaciones);
    } else if (porcentaje_bicis === 100) {
      data_estaciones.llenas.push(objeto_estaciones);
    } else if (porcentaje_bicis >= 60) {
      data_estaciones.max.push(objeto_estaciones);
    } else if (porcentaje_bicis <= 40) {
      data_estaciones.min.push(objeto_estaciones);
    }

    var porcentaje_bicis_str = "\t(" + porcentaje_bicis.toFixed(2) + " %)";

    var porcentaje_bicis_formato = objeto_estaciones.num_bikes_available + "/" + num_total_docks + "<span style='color:grey;'>" + porcentaje_bicis_str + "</span>";

    var hue = (porcentaje_bicis / 100) * 120;
    var backgroundColor = `hsla(${hue}, 100%, 50%, 0.7)`; // 0.7 es la opacidad

    let unix_timestamp = objeto_estaciones.last_reported;
    var date = new Date(unix_timestamp * 1000);
    var reported_time = date.toLocaleTimeString("it-IT");

    const row = document.createElement("tr");
    row.innerHTML = 
      `<td><strong>${objeto_estaciones.name}</strong></td>
       <td>${objeto_estaciones.num_bikes_available === 0 ? "No" : "Sí"}</td>
       <td>${objeto_estaciones.num_bikes_available_types.ebike}</td>
       <td>${objeto_estaciones.num_bikes_available_types.mechanical}</td>
       <td style="background-color: ${backgroundColor}">${porcentaje_bicis_formato}</td>
       <td>${objeto_estaciones.is_renting ? "Sí" : "No"}</td>
       <td>${objeto_estaciones.num_bikes_disabled}</td>
       <td>${objeto_estaciones.num_docks_disabled}</td>
       <td>${objeto_estaciones.status}</td>
       <td>${reported_time}</td>`;

    if (objeto_estaciones.num_bikes_available !== 0) {
      row.querySelector('td:nth-child(2)').classList.add('bikes-yes');
    } else {
      row.querySelector('td:nth-child(2)').classList.add('bikes-no');
    }

    tableBody.appendChild(row);
  });

  mostrar_tabla_concl(bicicletas_en_uso, data_estaciones);

  const nombresEstaciones = objeto_estaciones.map(estacion => estacion.name);
  mostrarGraficoBarras(nombresEstaciones, objeto_estaciones);
}

function mostrar_tabla_concl(bicicletas_en_uso, objeto_data_estaciones) {
  uso_total()
    .then(result => {
      var bicis_electricas_totales = result.bicis_electricas_totales;
      var bicis_mecanicas_totales = result.bicis_mecanicas_totales;
      var bicicletas_totales = result.bicicletas_totales;
      var bicicletas_totales_format = `${bicicletas_en_uso} / ${bicicletas_totales}`;
      const tableBody = document.querySelector("#data1 tbody");

      while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
      }

      const row = document.createElement("tr");
      row.innerHTML = 
        `<td>${bicis_electricas_totales}</td>
         <td>${bicis_mecanicas_totales}</td>
         <td>${bicicletas_totales_format}</td>`;
      tableBody.appendChild(row);
    })
    .catch(error => {
      console.error("Ocurrió un error:", error);
    });
}

function mostrarGraficoBarras(etiquetas, objeto_data_estaciones) {
  if (!Array.isArray(etiquetas)) {
    console.error("Las etiquetas no son un arreglo válido.");
    return;
  }

  const datos = etiquetas.map(nombreEstacion => {
    const estacion = objeto_data_estaciones.find(estacion => estacion.name === nombreEstacion);
    return estacion ? estacion.num_bikes_available : 0;
  });

  const ctx = document.getElementById('graficoBarras').getContext('2d');

  // Destruir el gráfico anterior si existe
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [{
        label: 'Uso de Bicicletas por Estación',
        data: datos,
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
      }],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function filtrarEstaciones() {
  const input = document.getElementById('busquedaEstaciones');
  const filtro = input.value.toLowerCase();
  const filas = document.querySelectorAll('#data2 tbody tr');
  
  filas.forEach(fila => {
    const ubicacion = fila.querySelector('td:first-child').textContent.toLowerCase();
    if (ubicacion.includes(filtro)) {
      fila.style.display = '';
    } else {
      fila.style.display = 'none';
    }
  });
}

// Carga inicial
actualizarTabla();

setInterval(actualizarTabla, 8000); // Actualización de la tabla (loop)
