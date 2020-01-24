// initial values
let sort = {2: "desc"};
let page = 1;

const initEasyTable = tblProps => {
    let tbl = document.createElement('table');
    tbl.classList.add('table');
    let thead = document.createElement('thead');
    let colHeaders = document.createElement('tr');
    colHeaders.classList.add('column-header');
    let colFilters = document.createElement('tr');
    colFilters.classList.add('table-filter');
    tblProps.columns.forEach(col => {
        // Create column header
        let colHeader = document.createElement('th')
        colHeader.innerHTML = col.label;
        colHeaders.appendChild(colHeader);
        // Create column filter field if filter is defined
        if ('filter' in col){
            let colFilter = document.createElement('td');
            switch(col.filter) {
                case 'text':
                    filter = document.createElement('input');
                    filter.type = 'text';
                    filter.classList.add('form-control', 'input-sm');
                    filter.id = col.label.toLowerCase().split(' ').join('-');
                    filter.name = col.label.toLowerCase().split(' ').join('-');
                    colFilter.appendChild(filter);
                    break;

                default:
                    filter = document.createElement('input');
                    filter.type = 'text';
                    filter.classList.add('form-control', 'input-sm');
                    filter.id = col.label.toLowerCase().split(' ').join('-');
                    filter.name = col.label.toLowerCase().split(' ').join('-');
                    colFilter.appendChild(filter);

            }
            colFilters.appendChild(colFilter);
        }
    });
    thead.appendChild(colHeaders);
    thead.appendChild(colFilters);
    tbl.appendChild(thead);
    let tbody = document.createElement('tbody');
    tbl.appendChild(tbody);
    tblProps.tblContainer.appendChild(tbl);
    tblProps.tblContainer.innerHTML += `
        <div class="row">
            <div class="col-sm-6">
                Displayed <span id="tbl-count-displayed"></span> out of <span id="tbl-count-filtered"></span> filtered. Total <span id="tbl-count-total"></span> records.
            </div>
            <div class="col-sm-6">
                <nav aria-label="Pagination" class="pagination">
                    <ul class="pagination"></ul>
                </nav>
            </div>
        </div>
    `;

    initFilters(tblProps);
    initSortListeners(tblProps);

    reloadTableData(tblProps);
}

// init collapse togler in data
// TODO: extract out of this function
const initCollapseToggler = () => {
    let collapseTogglerBtns = document.querySelector(".collapse-toggler-btn");
    if (collapseTogglerBtns){
        collapseTogglerBtns.addEventListener('click', (e) => {
            let icon = e.currentTarget.querySelector('i');
            let label = e.currentTarget.querySelector('span.btn-label');
            if (icon.classList.contains('fa-chevron-down')){
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
                label.innerHTML = "Show less";
            } else {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
                label.innerHTML = "Show more";
            }
        });
    }
}

// init pagination listeners
const initPaginationListeners = (tblProps) => {
    let btns = tblProps.tblContainer.querySelectorAll("ul.pagination li a");
    btns.forEach(btn => btn.addEventListener('click', e => {
        goToPage(e, tblProps)
    }));
}

// init keyup listener for filters
const initFilters = (tblProps) => {
    inputs = tblProps.tblContainer.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keyup', () => {
            page = 1;
            reloadTableData(tblProps);
        });
    });
}

// init click listener for sort
const initSortListeners = tblProps => {
    colHeaders = tblProps.tblContainer.querySelectorAll('tr.column-header th');
    colHeaders.forEach((head, i) => {
        if (!head.classList.contains('no-sort')){
            head.addEventListener('click', e => {
                sortColumns(e.currentTarget, i, tblProps)
            });
            head.style.cursor = 'pointer';
        }
    });
}

const sortColumns = (colHead, col, tblProps) => {
    sort = window.sessionStorage.getItem(tblProps.tblLabel + "sort");
    if (sort){
        sort = JSON.parse(sort);
    } else {
        sort = {};
    }
    if (!(col in sort)){
        sort[col] = "asc";
    } else if (sort[col] === "asc"){
        sort[col] = "desc";
    } else {
        delete sort[col];
    }
    page = 1;
    icons = colHead.querySelector('i.fa');
    if (icons) icons.remove();
    if (col in sort){
        colHead.innerHTML += `<i class="fa fa-sort-${ (sort[col] == "desc") ? "up" : "down" } px-1"></i>`;
    }
    window.sessionStorage.setItem(tblProps.tblLabel + "sort", JSON.stringify(sort));
    reloadTableData(tblProps);
};

const goToPage = (e, tblProps) => {
    e.preventDefault();
    let btn = e.target;
    page = parseInt(btn.dataset.pagenum);
    reloadTableData(tblProps);
}

const reloadQueryData = (inputs, tblProps) => {
    let data = {}
    let filter = {}
    inputs.forEach(input => {
        filter[input.name] = input.value;
    });
    data['filter'] = filter;
    data['sort'] = JSON.parse(window.sessionStorage.getItem(tblProps.tblLabel + "sort"));
    data['page'] = page;
    return data;
}

const reloadTableData = async tblProps => {
    const table = tblContainer.querySelector('table');
    const inputs = table.querySelectorAll('.table-filter input');
    const queryData = await reloadQueryData(inputs, tblProps);
    const columns = tblProps.columns;

    // get data from api
    const response = await fetch(tblProps.ajaxUrl, {
        method: 'POST',
        body: JSON.stringify(queryData),
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const tableData = await response.json();

    // render table
    const rows = tableData['rows']
    tbody = table.querySelector('tbody');
    tbody.innerHTML = "";
    rows.forEach(row => {
        tblRow = `<tr class="${ ('row_class' in row ? row.row_class : '') }">`;
        columns.forEach(col => {
            tblRow += `<td class="${ ( 'class' in col ) ? col.class : '' }">`;
            if (col.render){
                tblRow += col.render(row[col.ajaxKey])
            } else {
                tblRow += row[col.ajaxKey];
            }
            tblRow += "</td>";
        });
        tblRow += "</tr>";
        tbody.innerHTML += tblRow;
    });

    // render count
    count = tableData['count'];
    for (let key in count){
        document.querySelector(`span#tbl-count-${ key }`).innerHTML = count[key];
    }

    // render pagination
    pagination = document.querySelector("ul.pagination");
    pagination.innerHTML = "";
    activePage = parseInt(queryData['page']);
    for(let i = 1; i <= tableData['num_of_pages']; i++){
        if (i >= activePage -4 && i <= activePage +4){
            pagination.innerHTML += `
                <li class="page-item ${ (i === activePage) ? 'active' : '' }">
                    <a class="page-link" href="#" data-pagenum="${ i }">
                        ${ i }
                    </a>
                </li>
            `;
        }
    }

    if (activePage > 5){
        pagination.innerHTML = `
                <li class="page-item" ${(activePage > 6 ? 'style="margin-right: 5px"': '')}>
                    <a class="page-link" href="#" data-pagenum="1">
                        1
                    </a>
                </li>
            ` + pagination.innerHTML;
    }
    if (activePage + 5 <= tableData['num_of_pages']){
        pagination.innerHTML += `
                <li class="page-item" ${(activePage + 5 <= tableData['num_of_pages'] ? 'style="margin-left: 5px"': '')}>
                    <a class="page-link" href="#" data-pagenum="${tableData['num_of_pages']}">
                        ${tableData['num_of_pages']}
                    </a>
                </li>
            `;
    }

    initPaginationListeners(tblProps);
    initCollapseToggler();
}
