'use strict';

(function () {
  $(document).ready(function () {
    tableau.extensions.initializeAsync().then(function () {
      const pageSize = 12;
      let currentPage = 0;
      let apiPage = -1;
      let isLoading = false;
      let totalpage = 1;
      let preload = []
      const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
      const worksheet = worksheets.find(sheet => sheet.name === "Detalle innovaciones");
      async function getdata() {
        isLoading = true;
        try {
          const dataTableReader = await worksheet.getSummaryDataReaderAsync();
          let dataTablePage = null
          if (preload.length < pageSize * (currentPage + 1)) {
            apiPage = apiPage + 1
            if (totalpage > apiPage) {
              dataTablePage = await dataTableReader.getPageAsync(apiPage);
              totalpage = dataTableReader.pageCount;
              const data = getJsonFromArray(dataTablePage);
              preload = [...preload, ...data]
            }
          }

          let next = pageSize + (currentPage * pageSize);
          let isNext = preload.length - 1 < next;
          if (isNext && preload.length < currentPage * pageSize) {
            await dataTableReader.releaseAsync();
            isLoading = false;
            return
          }
          generateRender(preload.slice(currentPage * pageSize, isNext ? preload.length - 1 : next));
          await dataTableReader.releaseAsync();
          isLoading = false;
        } catch (e) {
          console.log(e);
        }
      }

      function positionTooltip(e) {
        let tooltip = $("#tooltip")
        const mouseX = e.pageX;
        const tooltipWidth = tooltip.outerWidth();
        const screenWidth = $(window).width();
        const spaceRight = screenWidth - mouseX;
        const leftPosition = spaceRight > tooltipWidth + 20
          ? mouseX + 10
          : mouseX - tooltipWidth - 10;
        tooltip.css({
          top: e.pageY + 10 + "px",
          left: `${leftPosition}px`,
        });
      }
      function generateRender(data) {
        const $app = $('#app');
        data.forEach(item => {
          const $card = $('<div>').addClass('card_new');
          const $content = $('<div>').addClass('content');
          const url = item['attr(imageurls)'];

          const $image = $('<img>')
            .attr('src', url)
            .css({
              maxWidth: '250px',
              maxHeight: '125px'
            })
            .addClass('center-block');
          $content.attr('data-tooltip', `
    <div style="display:flex;flex-direction:column;">
      <span>${item['sku_nombre']}</span>
      <span><b>Precio Actual Publicado</b>: $${(item['avg(precio_actual_publicado)'])?.toFixed(2)}</span>
      <span><b>Precio Regular</b>: $${(item['avg(precio_regular)'])?.toFixed(2)}</span>
    </div>`);


          $content.append($image);

          const $p = $('<p>')
            .css({
              whiteSpace: 'pre-wrap',
              lineHeight: '18px'
            })
            .html(`
          <span>${item['fecha_ingreso'].replaceAll('-', '/')}</span>
          <span>${item['e-commerce_']}</span>
          <span style="hyphens: auto;text-align: center;max-width:90%">${item['sku_nombre']?.substring(1, 200)}</span>
          <span><b>UPC</b>: ${item['upc']}</span>
          <span><b>Marca</b>: ${item['attr(marca)']}</span>
          <span><b>Precio Actual Publicado</b>: $${(item['avg(precio_actual_publicado)'])?.toFixed(2)}</span>
          <span><b>Precio Regular</b>: $${(item['avg(precio_regular)'])?.toFixed(2)}</span>
        `);

          $content.append($p);
          $card.append($content);
          $app.append($card);
        });

        $(".content").hover(
          function (e) {
            const tooltipText = $(this).data("tooltip");
            $("#tooltip")
              .html(tooltipText)
              .css({
                display: "block"
              });
            positionTooltip(e);
          },
          function () {
            $("#tooltip").hide();
          }
        );

        $(".content").mousemove(function (e) {
          positionTooltip(e);
        });
      }
      function getJsonFromArray(array) {
        let result = [];
        const col = array["_columns"].map(e => e["_fieldName"].toLowerCase().replaceAll(" ", "_"));
        array["_data"].forEach(e => {
          let obj = {};
          col.forEach((s, i) => obj[s] = e[i]["_value"]);
          result.push(obj);
        });
        return result;
      }
      const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !isLoading) {
          currentPage++;
          getdata();
        }
      });
      const paginationTrigger = document.getElementById('pagination');
      observer.observe(paginationTrigger);
      getdata();

      worksheet.addEventListener(tableau.TableauEventType.FilterChanged, (e) => {
        $('#app').empty();
        currentPage = 0;
        apiPage = -1;
        isLoading = false;
        totalpage = 1;
        preload = []
        getdata();
      });
    });
  });
})();
