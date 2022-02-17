const machines = new Array("a","b","c","d");

machines.forEach(function(machineName, index, array) {
    console.log(machineName);
    console.log("Date=",Date.now()); // unix time,1970-01-01 00:00:00(UTC)からの秒数(ミリ秒単位)で取得
    //date = new Date(1999, 11, 31); // => 1999-12-31 00:00:00.000
    const dateToday = new Date(Date.UTC(2022, 1, 16));
    d3.json("/get_timeline_data", {
        method: "POST",
        body: JSON.stringify({
            date: dateToday.getTime(),
        })
    }).then((data) => {
        console.log(data)
        writeMachineName(machineName)
        DrawTimeLine(data["ProductionData"], data["DowntimeData"], data["PowerOffData"], data, machineName);
    }).catch((error) => {
        console.error("Error loading the data: " + error);
    });
    
    
}); 

function writeMachineName(machineName){
    const parentnode = document.getElementById('timeline');
    const childElement = document.createElement('div');
    const newContent = document.createTextNode("設備 "+machineName); // テキストノードを作成
    childElement.appendChild(newContent); // p要素にテキストノードを追加
    childElement.setAttribute("id","timeline-"+machineName); // idを設定
    parentnode.appendChild(childElement);
}

function DrawTimeLine(productionDataset, downtimeDataset, powerOffDataset, data, machineName) {
    // access data
    const xAccessor = d => d["Date"]
    const yAccessor = d => d["Value"]

    //set dimensions
    let dimensions = {
        //width: screen.width - 500, //default 500
        width: window.outerWidth -100,
        height: 75,
        margin: {top: 0, right: 40, bottom: 20, left: 40,},
    }
    //draw canvas
    const wrapper = d3.select("#timeline-"+machineName)
        .append("svg")
        .attr("viewBox", "0 0 " + dimensions.width + " " + dimensions.height)
    const bounds = wrapper.append("g")


    //set scales
    const chartStartsAt = productionDataset[0]["Date"]
    const chartEndsAt = productionDataset[productionDataset.length - 1]["Date"]

    console.log("chartStartsAt=",chartStartsAt,"chartEndsAt=",chartEndsAt)
    const xScale = d3.scaleTime()
        .domain([chartStartsAt, chartEndsAt])
        .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
    const yScale = d3.scaleLinear()
        .domain(d3.extent(productionDataset, yAccessor))
        .range([dimensions.height - dimensions.margin.bottom, 0])

    console.log("screen.width",screen.width)
    console.log("xScale",xScale)
    var formatTime = d3.timeFormat("%H%M"); // %H%M = 1636 = 16時36分
    console.log("formatTime",formatTime(new Date)); // 


    // prepare data
    const productionAreaGenerator = d3.area()
        .x(d => xScale(xAccessor(d)))
        .y0(dimensions.height - dimensions.margin.bottom)
        .y1(d => yScale(yAccessor(d)))
        .curve(d3.curveStepAfter);
    const downtimeAreaGenerator = d3.area()
        .x(d => xScale(xAccessor(d)))
        .y0(dimensions.height - dimensions.margin.bottom)
        .y1(d => yScale(yAccessor(d)))
        .curve(d3.curveStepAfter);
    const powerOffAreaGenerator = d3.area()
        .x(d => xScale(xAccessor(d)))
        .y0(dimensions.height - dimensions.margin.bottom)
        .y1(d => yScale(yAccessor(d)))
        .curve(d3.curveStepAfter);

    //tickFormat(d3.time.format('%H:00'));
    //d3.axisBottom(xScale).tickFormat(d3.timeFormat("%H:")) // 24時間制の時間 [00,23]フォーマット
    

    // prepare tooltip
    let div = d3.select("#timeline").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0.7)
        .style("visibility", "hidden");
    const timeScale = d3.scaleTime()
        .domain([new Date(chartStartsAt * 1000), new Date(chartEndsAt * 1000)])
        .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
    // bounds.append("g")
    //     .attr("transform", "translate(0," + (dimensions.height - dimensions.margin.bottom) + ")")
    //     .call(d3.axisBottom(timeScale))
    bounds.append("g")
        .attr("transform", "translate(0," + (dimensions.height - dimensions.margin.bottom) + ")")
        .call(d3.axisBottom(timeScale).tickFormat(d3.timeFormat("%H:00")))  // 日付のフォーマット変換

    // draw data with tooltip
    bounds.append("path")
        .attr("d", productionAreaGenerator(productionDataset))
        .attr("fill", "green") //稼働中
        .on('mousemove', (event) => {
                let coords = d3.pointer(event);
                let timeEntered = timeScale.invert(coords[0]) / 1000
                let now = new Date(timeEntered * 1000).toLocaleString()
                let start = new Date(productionDataset.filter(i => i["Date"] < timeEntered).pop()["Date"] * 1000).toLocaleString()
                let end = new Date(productionDataset.filter(i => i["Date"] > timeEntered)[0]["Date"] * 1000).toLocaleString()
                div.html(now + "<br/>Production<br/>" + start + "<br/>" + end)
                    .style("visibility", "visible")
                    .style("top", (event.pageY) - 60 + "px")
                    .style("left", (event.pageX) - 60 + "px")
            }
        )
        .on('mouseout', () => {
                div.transition()
                div.style("visibility", "hidden")
            }
        )
    bounds.append("path")
        .attr("d", downtimeAreaGenerator(downtimeDataset))
        .attr("fill", "orange")  //停止 から 
        .on('mousemove', (event) => {
                let coords = d3.pointer(event);
                let timeEntered = timeScale.invert(coords[0]) / 1000
                let now = new Date(timeEntered * 1000).toLocaleString()
                let start = new Date(downtimeDataset.filter(i => i["Date"] < timeEntered).pop()["Date"] * 1000).toLocaleString()
                let end = new Date(downtimeDataset.filter(i => i["Date"] > timeEntered)[0]["Date"] * 1000).toLocaleString()
                div.html(now + "<br/>Downtime<br/>" + start + "<br/>" + end)
                    .style("visibility", "visible")
                    .style("top", (event.pageY) - 60 + "px")
                    .style("left", (event.pageX) - 60 + "px")
            }
        )
        .on('mouseout', () => {
                div.style("visibility", "hidden")
            }
        )
    bounds.append("path")
        .attr("d", powerOffAreaGenerator(powerOffDataset))
        .attr("fill", "gray") //電源オフの場合の色 default:red
        .on('mousemove', (event) => {
                let coords = d3.pointer(event);
                let timeEntered = timeScale.invert(coords[0]) / 1000
                let now = new Date(timeEntered * 1000).toLocaleString()
                let start = new Date(powerOffDataset.filter(i => i["Date"] < timeEntered).pop()["Date"] * 1000).toLocaleString()
                let end = new Date(powerOffDataset.filter(i => i["Date"] > timeEntered)[0]["Date"] * 1000).toLocaleString()
                div.html(now + "<br/>PowerOff<br/>" + start + "<br/>" + end)
                    .style("visibility", "visible")
                    .style("top", (event.pageY) - 60 + "px")
                    .style("left", (event.pageX) - 60 + "px")
            }
        )
        .on('mouseout', () => {
                div.style("visibility", "hidden")
            }
        )
}