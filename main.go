package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/kardianos/service"
	//-- log.go
	//-- homepage.go
	// "github.com/julienschmidt/httprouter"
	// "net/http"
)

const serviceName = "D3 WebService"
const serviceDescription = "D3 web interface for timeline chart"

type program struct{}

func main() {
	logInfo("MAIN", serviceName+" starting...")
	serviceConfig := &service.Config{
		Name:        serviceName,
		DisplayName: serviceName,
		Description: serviceDescription,
	}
	prg := &program{}
	s, err := service.New(prg, serviceConfig)
	if err != nil {
		logError("MAIN", "Cannot start: "+err.Error())
	}
	err = s.Run()
	if err != nil {
		logError("MAIN", "Cannot start: "+err.Error())
	}
}

func (p *program) Start(service.Service) error {
	logInfo("MAIN", serviceName+" started")
	go p.run()
	return nil
}

func (p *program) Stop(service.Service) error {
	logInfo("MAIN", serviceName+" stopped")
	return nil
}

func (p *program) run() {
	router := httprouter.New()
	router.ServeFiles("/js/*filepath", http.Dir("js"))
	router.ServeFiles("/css/*filepath", http.Dir("css"))
	router.GET("/", homepage)
	router.POST("/get_timeline_data", getTimeLineData)
	//err := http.ListenAndServe(":80", router)
	err := http.ListenAndServe(":3000", router)
	if err != nil {
		logError("MAIN", "Problem starting service: "+err.Error())
		os.Exit(-1)
	}
	logInfo("MAIN", serviceName+" running")
}

//--- log.go

func logInfo(reference, data string) {
	fmt.Println("[" + reference + "] --INF-- " + data)
}

func logError(reference, data string) {
	fmt.Println("[" + reference + "] --ERR-- " + data)
}

func homepage(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	logInfo("MAIN", "Serving homepage")
	http.ServeFile(writer, request, "./html/homepage.html")
}

//----
type TimelineInput struct {
	Date int64
}

type TimelineOutput struct {
	Result         string
	ProductionData []TimelineData
	DowntimeData   []TimelineData
	PowerOffData   []TimelineData
}

type TimelineData struct {
	Date  int64
	Value int
}

func getTimeLineData(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	logInfo("MAIN", "Timeline function called")
	var data TimelineInput
	err := json.NewDecoder(request.Body).Decode(&data)
	if err != nil {
		logError("MAIN", "Error parsing data: "+err.Error())
		var responseData TimelineOutput
		responseData.Result = "nok: " + err.Error()
		writer.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(writer).Encode(responseData)
		logInfo("MAIN", "Parsing data ended")
		return
	}
	endTime := time.Unix(data.Date/1000, 0)
	var productionData []TimelineData
	var downtimeData []TimelineData
	var powerOffData []TimelineData
	initialTime := endTime.Add(-24 * time.Hour)
	previousState := -1
	for initialTime.Before(endTime) {
		randomState := rand.Intn(3-0) + 0
		randomDuration := rand.Intn(61-1) + 1
		if previousState != randomState {
			switch randomState {
			case 0:
				{
					productionData = append(productionData, TimelineData{Date: initialTime.Unix(), Value: 1})
					downtimeData = append(downtimeData, TimelineData{Date: initialTime.Unix(), Value: 0})
					powerOffData = append(powerOffData, TimelineData{Date: initialTime.Unix(), Value: 0})
				}
			case 1:
				{
					productionData = append(productionData, TimelineData{Date: initialTime.Unix(), Value: 0})
					downtimeData = append(downtimeData, TimelineData{Date: initialTime.Unix(), Value: 1})
					powerOffData = append(powerOffData, TimelineData{Date: initialTime.Unix(), Value: 0})
				}
			case 2:
				{
					productionData = append(productionData, TimelineData{Date: initialTime.Unix(), Value: 0})
					downtimeData = append(downtimeData, TimelineData{Date: initialTime.Unix(), Value: 0})
					powerOffData = append(powerOffData, TimelineData{Date: initialTime.Unix(), Value: 1})
				}
			}
		}
		previousState = randomState
		initialTime = initialTime.Add(time.Duration(randomDuration) * time.Minute)
	}
	productionData = append(productionData, TimelineData{Date: endTime.Unix(), Value: 0})
	downtimeData = append(downtimeData, TimelineData{Date: endTime.Unix(), Value: 0})
	powerOffData = append(powerOffData, TimelineData{Date: endTime.Unix(), Value: 0})
	var responseData TimelineOutput
	responseData.Result = "ok"
	responseData.ProductionData = productionData
	responseData.DowntimeData = downtimeData
	responseData.PowerOffData = powerOffData
	writer.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(writer).Encode(responseData)
	logInfo("MAIN", "Parsing data ended")
}
