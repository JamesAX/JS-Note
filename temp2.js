/*global jQuery:false */
/*global sap:false */
/*global console:false */
/*global sapById:false */
/*global localStorage:false*/
/*global huawei:false */
/*global $:false */
/*global sLocale:false */
/*global window:false */

(function () {
  "use strict";
  jQuery.sap.declare("huawei.cmes.control.charts.KPIChart");
  jQuery.sap.require("huawei.cmes.util.parameters.QualityChartsParameters");
  jQuery.sap.require("huawei.cmes.util.services.Provider");
  jQuery.sap.require("huawei.cmes.util.services.Proxy");
  jQuery.sap.require("huawei.cmes.util.commons.Helper");
  jQuery.sap.require("huawei.cmes.util.chart.Helper");
  jQuery.sap.require("huawei.cmes.util.commons.BOFactory");
  jQuery.sap.require("huawei.cmes.util.parameters.BOMap");
  
  var HTTP = huawei.cmes.util.http;
  var HELPER = huawei.cmes.util.commons.Helper;
  var CHART_HELPER = huawei.cmes.util.chart.Helper;
  var BOJsonData = huawei.cmes.util.parameters.BOMap;
  BOJsonData = BOJsonData["dashboard-bo"];
  var BOFactory = huawei.cmes.util.commons.BOFactory;
  sap.ui.core.Control.extend("huawei.cmes.control.charts.KPIChart", {
    metadata: {
      properties: {
        "filter": "string",
        "title": "string",
        "height": "string",
        "width": "string",
        "legendPosition": "string",
        "unit": "string",
        "color": [],
        "category": "int",
        "period": "string"    
      },

    },
    aggregations: {
      "content": {
        singularName: "content"
      },
    },
    defaultAggregation: "content",
    ajaxGet: HTTP.ajaxGet,
    

    /**
     * _initCompositeSupport - set properties to initialize the KPI chart class
     * @param  {object} properties - the properties for KPI chart
     * @return {none}
     */
    _initCompositeSupport: function (properties) {

      //set language
      this.languageSetting();
      
      this._globalPeriodLegend="";

      //set query url
      var sFilter,sPeriod;
      sFilter = "?KPI_KEY=" + properties.title;
      sPeriod = properties.period;
      console.log(sPeriod);
      this._globalPeriodLegend=this.ConvertChartLegendValue(sPeriod);
      console.log(this._globalPeriodLegend);
      
      this.KPI = properties.title;
      this.TITLE = this.oBundle.getText(properties.title + "_l");

      //dimension names of current kpi chart
      this.dimNames = [];
      //URL of the service used to get the dimension names
      this.settingService = huawei.cmes.util.services.Provider.QualityService
        .getDimColloection;

      var jsonData = huawei.cmes.util.commons.Helper.getSettings(this.settingService,
        sFilter);

      for (var i = 0; i < jsonData.length; i++) {
        //jsonData[i].KPI_TYPE : 0 network, 1 terminal
        //如果该分类维度数组不存在则新建空数组
        if (this.dimNames[jsonData[i].KPI_TYPE] === undefined) {
          this.dimNames[jsonData[i].KPI_TYPE] = [];
        }
        //将相应dimension key 加入到数组
        this.dimNames[jsonData[i].KPI_TYPE].push(jsonData[i].DIMENSION_KEY);
        //for network   this.dimName[0] = ['dimension0_1','dimension0_2',...] 
        //for terminal  this.dimName[1] = ['dimension1_1','dimension1_2',...] 
      }

    },

    /**
     * init - initial controller
     * @return {none}
     */
    init: function () {

      this.sParentId = "";
      //set chart colors
      this.sColorss = ["#FFD3A7", "#99D0B0", "#87CEFA"];

      //save all dimension charts of current KPI chart
      this.dimCharts = [];
      //save all models of dimension charts to reduce the reload of data from backend
      this.dimModels = [];
      
      this.createChart(this._globalPeriodLegend);
      sap.kpiSelected = "LAR";
    },

    /**
     * Set language
     */
    languageSetting: function () {
      this._sLocale = localStorage.getItem('LANG-KEY') || '';
      this.oBundle = jQuery.sap.resources({
        url: "i18n/messageBundle.properties",
        locale: sLocale
      });
    },
    
    //convert chart legend value to standard period value 00315717
    ConvertChartLegendValue: function (sPeriod) {
      //var oData = oChart.getModel().oData;
      if (sPeriod==='YEAR'){
          this._globalPeriodLegend='CurrentYearValue';
      } else if (sPeriod==='Quartor'){
          this._globalPeriodLegend='CurrentQuartorValue';
      } else if (sPeriod==='WEEK'){
          this._globalPeriodLegend='CurrentWeekValue';
      } else if (sPeriod==='DAY'){
          this._globalPeriodLegend='CurrentDayValue';
      } else {
          this._globalPeriodLegend='ActualValue';
      } 
      return  this._globalPeriodLegend;
    },
    
    /**
     * renderer - Render this page
     * @param oRm
     * @param oControl
     */
    renderer: function (oRm, oControl) {
      //could extend based on requiremnt

      if (oControl.getWidth()) oControl._KPIChart.setWidth(oControl.getWidth());
      if (oControl.getHeight()) oControl._KPIChart.setHeight(oControl.getHeight());
      oControl._setChartColor(oControl);

      oRm.renderControl(oControl._KPIChart);

    },

    /**
     * getSubDimChart generate dimension chart
     * @param  {Integer} dimIndex - the index of dimension chart that need to generate
     * @return {sap.viz.ui5.Line} - the dimension chart
     */
    getSubDimChart: function (dimIndex) {
      //create dimension chart
      var subDimChart = new sap.viz.ui5.Line({
        title: new sap.viz.ui5.types.Title({
          //set the title of chart
          //this.dimNames - array - save all dimension names
          //this.getCategory() - 0:Network, 1:Terminal 
          //dimIndex - teh index of dimension chart that need to generate
          text: this.dimNames[this.getCategory()][dimIndex]
        }),
        width: "100%",
        //        height: "280px",
        selectData: this.onSelectData
      }).addStyleClass('quality-dimension-chart');

      subDimChart.attachDeselectData(CHART_HELPER.onDeSelectRerender);

      var oFilters = [];

      //oFilters[0] = new sap.ui.model.Filter("DIMENSION",sap.ui.model.FilterOperator.EQ,(dimIndex+1).toString());
      //oFilters[0] = new sap.ui.model.Filter("KPI_TAG",sap.ui.model.FilterOperator.EQ,"0");
      //set dataset of dimension chart
      var oDataset = new sap.viz.ui5.data.FlattenedDataset({
        dimensions: [{
          axis: 1,
          name: this.oBundle.getText("chart_period"),
          value: {
            path: 'PERIOD',
            //show value in proper formater
            formatter: function (value) {
              value = huawei.cmes.util.commons.Formatters.chartPeriodFormatter(
                value, "");
              return value;
            }
          }
        }, {
          axis: 2,
          name: this.oBundle.getText("dimension"),
          value: "{DIMENSION}"
        }],

        //set measures of dimension chart
        measures: [{
          name: this.oBundle.getText("CurrentMonthValue"),
          value: "{KPI_VALUE}"
        }],
        data: {
          path: "/",
          //set filters
          filters: oFilters,
          sort: "{PERIOD}"
        }
      });

      //set dateset of dimension chart
      subDimChart.setDataset(oDataset);
      //generate two legend positions
      var lengendPosition = new sap.viz.ui5.types.Legend({
        layout: {
          position: sap.viz.ui5.types.legend.Common_position.bottom
        }
      });
      var lengendPosition1 = new sap.viz.ui5.types.Legend({
        layout: {
          position: sap.viz.ui5.types.legend.Common_position.right
        }
      });
      subDimChart.setLegendGroup(lengendPosition, lengendPosition1);

      //get plot area
      var oLinePlotArea = subDimChart.getPlotArea();
      //huawei.cmes.util.chart.Helper.setChartAttributes(oLinePlotArea, false);      
      oLinePlotArea.setColorPalette(this.sColors);

      //set marker size
      oLinePlotArea.getMarker().setSize(4);

      //set model for dimension chart
      var oModel = new sap.ui.model.json.JSONModel();
      subDimChart.setModel(oModel);

      //save dimension chart in array this.dimCharts
      this.dimCharts[dimIndex] = subDimChart;
      return subDimChart;
    },

    /**
     * getDefectChart generate defect chart
     * @param  {String} defectType - the type of defect: phenomenon, cause
     * @param  {String} chartType - the chart type: pie, dual, bar
     * @return {vizchart} - defect chart
     */
    getDefectChart: function (defectType, chartType) {
      var height = "280px";
      var defectChart = null;
      var oDataset = null;
      var defectTypes = ["defect_phenomenon", "defect_causes"];

      //set corresponding dataset for defect chart
      switch (chartType) {
        //set dataset for bar chart
      case "bar":
        oDataset = new sap.viz.ui5.data.FlattenedDataset({
          dimensions: [{
            axis: 1,
            name: this.oBundle.getText(defectTypes[defectType]),
            value: "{DEFECT}"
          }],

          measures: [{
            name: this.oBundle.getText("pcs_defect"),
            value: {
              path: 'KPI_VALUE',
              //formatter:  huawei.cmes.util.commons.Formatters.charYAxisFormatter
            }
          }],
          data: {
            path: "/"
          }
        });

        defectChart = new sap.viz.ui5.Bar({
          width: "100%",
          height: height,
          selectData: this.onSelectData
        });
        break;
        //set dataset for pie chart
      case "pie":
        oDataset = new sap.viz.ui5.data.FlattenedDataset({
          dimensions: [{
            axis: 1,
            name: this.oBundle.getText(defectTypes[defectType]),
            value: "{DEFECT}"
          }],

          measures: [{
            name: this.oBundle.getText("pcs_defect"),
            value: "{KPI_VALUE}"
          }],
          data: {
            path: "/"
          }
        });

        defectChart = new sap.viz.ui5.Pie({
          width: "100%",
          height: height,
          selectData: this.onSelectData
        });
        break;
        //set dataset for dual_combination
      case "dual_combination":
        defectChart = new sap.viz.ui5.DualCombination({
          width: "100%",
          height: height,
          selectData: this.onSelectData
        });
        defectChart.attachDeselectData(CHART_HELPER.onDeSelectRerender);
        oDataset = new sap.viz.core.FlattenedDataset({
          dimensions: [{
            axis: 1,
            name: this.oBundle.getText(defectTypes[defectType]),
            value: "{DEFECT}"
          }],

          measures: [{
            group: 1,
            name: this.oBundle.getText("pcs_defect"),
            value: "{KPI_VALUE}"
          }, {
            group: 2,
            name: this.oBundle.getText("accumulative_percent"),
            value: "{BOLA_VALUE}"
          }],

          data: {
            path: "/",
          }
        });
        break;

      }

      //set dataset for defect chart
      defectChart.setDataset(oDataset);
      var lengendPosition = new sap.viz.ui5.types.Legend({
        layout: {
          position: sap.viz.ui5.types.legend.Common_position.bottom
        }
      });

      //set position of legend group
      defectChart.setLegendGroup(lengendPosition);
      var oLinePlotArea = defectChart.getPlotArea();
      //huawei.cmes.util.chart.Helper.setChartAttributes(oLinePlotArea, false);     
      oLinePlotArea.setColorPalette(this.sColors);

      //set model of defect chart
      var defectModel = new sap.ui.model.json.JSONModel();
      defectChart.setModel(defectModel);

      return defectChart;
    },

    /**
     * _setChartColor - Set chart color
     * @param oControl - the controller
     */
    _setChartColor: function (oControl) {
      if (oControl.getColor() && oControl.getColor().length > 0) oControl.oLinePlotArea
        .setColorPalette(oControl.getColor());
    },

    /**
     * createChart - create KPI char
     */
    createChart: function (aa) {
      this._KPIChart = new sap.viz.ui5.Line({
        width: "100%",
        //        height: "280px",
        selectData: this.onSelectData
      }).addStyleClass('kpi-chart-middle');

      this.addAggregation("content", this._KPIChart);
      //set dataset of KPI chart
      this._oDataset = {
        dimensions: [{
          axis: 1,
          name: this.oBundle.getText("chart_period"),
          value: {
            path: 'PERIOD',
            formatter: function (value) {
              value = huawei.cmes.util.commons.Formatters.chartPeriodFormatter(
                value, "");
              return value;
            }
          }
        }],

        //set measures of KPI chart
        measures: [{
          //name: this.oBundle.getText("ActualValue"),
          name: this.oBundle.getText(aa),
          value: "{P_VALUE}"
        }, {
          name: this.oBundle.getText("AccuValue"),
          value: "{C_VALUE}"
        }, {
          name: this.oBundle.getText("TargetValue"),
          value: "{T_VALUE}"
        }],
        data: {
          path: "/"
        }
      };

      //generate dataset for KPI chart
      var oDataset = new sap.viz.ui5.data.FlattenedDataset(this._oDataset);
      //set dataset for KPI chart
      this._KPIChart.setDataset(oDataset);

      //generate legend position
      var lengendPosition = new sap.viz.ui5.types.Legend({
        layout: {
          position: sap.viz.ui5.types.legend.Common_position.bottom
        }
      });
      //set legend position for legend group of KPI chart
      this._KPIChart.setLegendGroup(lengendPosition);

      //get plot area of KPI chart
      this.oLinePlotArea = this._KPIChart.getPlotArea();
      // huawei.cmes.util.chart.Helper.setChartAttributes(this.oLinePlotArea, false);

      //set color for plot area of KPI chart
      this.oLinePlotArea.setColorPalette(this.sColors);
      //attach deselect data on KPI chart
      this._KPIChart.attachDeselectData(CHART_HELPER.onDeSelectRerender);
      //set marker size
      this.oLinePlotArea.getMarker().setSize(4);
    },


    /**
     * onSelectData - Call this function when the points and legends are clicked in Chart
     * Exclusive function for dimension Select Event
     * @param {oEvent} oEvent - ui5 select data event on KPI chart
     */
    onSelectData: function (oEvent) {
      //get dom reference of KPI chart
      var chart = oEvent.getSource().getDomRef();
      var chartId = chart.id;

      var svgLines = $(chart).find('.v-markers>.v-axis1>.v-marker');
      var lineLength = svgLines.length;
      var parentNode = svgLines.parent();

      var ctxPath = oEvent.getParameter("data")[0].data[0].ctx.path;
      var dii_a2 = ctxPath.dii_a2;
      var currentLegendIndex = ctxPath.mi;
      if (dii_a2 !== 0) {
        currentLegendIndex = dii_a2;
      }

      /**
       * Set Listener for Jumping to BO Pages
       */
      var checkDataPointsClickString = '.sub2chart-box .v-m-tooltip>.v-background>.v-tooltip-mainDiv>table';
      if ($(checkDataPointsClickString).length !== 0) {

        //Get infomation on tooltip
        var infos = $(".sub2chart-box .v-m-tooltip table>tr>td:nth-child(2)");
        //Get Date Info on tooltip
        var date = infos[0].textContent.replace(/\./g, '-');
        //Get Dimension on tooltip
        var dimension = infos[1].textContent;
        var value = infos[2].textContent;

        //Get APP
        var app = sap.ui.getCore().byId("idViewRoot--idApp");
        //Get Controller
        var controller = app.getCurrentDetailPage().getController();
        //Get Period / Value - MONTH || YEAR || DAY ||WEEK
        var period = controller._globalPeriod;

        //Chart Model Data
        var boData = sap.ui.getCore().byId(chartId).getModel().getData(); //BO Model Data
        var targetInfo = {};
        var info;
        
        //var infoResult;
        var PROXY = huawei.cmes.util.services.Proxy;
        var BOService = huawei.cmes.util.services.Provider.BOService;
        var url  = PROXY.XsodataProxy(BOService.getKPIItem); 
        var dataHandler = function (oData, boData) {
        	info = oData.d.results;
        	
        	boData.forEach(function (item, index) {
                //If the data matchs the data on tooltip
        		console.log(item.PERIOD.length);
        		console.log(item.PERIOD.substr(item.PERIOD.length-2,item.PERIOD.length)	);
                if (item.DIMENSION === dimension && 
                		(((period === "YEAR" || period === "MONTH") 
                				&& item.PERIOD === date) || 
                		((period === "WEEK") 
                				&& parseInt(item.PERIOD.substring(0,item.PERIOD.length-1).substring(item.PERIOD.substring(0,item.PERIOD.length-1).indexOf("-")+1)) === parseInt(date.substr(1)))||
                		((period === "DAY") 
                        		&& parseInt(item.PERIOD.substr(item.PERIOD.length-2,item.PERIOD.length)) === parseInt(date)))
                		&& item.KPI_VALUE === value) {
                  //get the data
                  targetInfo = $.extend(true, targetInfo, item);

                  var boUrl = 'http://' + location.host + '/BOE/OpenDocument/opendoc/openDocument.jsp?';
                  //Get the date in data
                  var targetDate = targetInfo.PERIOD.replace(/\-/g, ''); // Period is Date in model data naming rules
                  //Get the document Id in data
                               
                  var iDocId = info[0].DOCID;
                  //var startTimeKey = BOFactory.getBoDim("STARTDATE",info);
                  var startTimeKey = BOFactory.getBoDim("ENDDATE",info);
                  var endTimeKey = BOFactory.getBoDim("STARTDATE",info);
                  var dateTypeKey = BOFactory.getBoDim("DATETYPE",info);

                  //GLobal variables :sap.dimSelect
                  var boDim = BOFactory.getBoDim(sap.dimSelect,info);
                  boUrl += 'sIDType=CUID&iDocID=' + iDocId; //Doc ID
                  boUrl += '&lsM' + boDim + '=' + targetInfo.DIMENSION;
                  //Get Period
                  var targetPeriod = period;
                  var year,month,week;
                  var startDate = sap.startDate;
                  var endDate = sap.startDate;
                  var dateType = "月";
                  if (targetPeriod === 'DAY') {
                	  endDate = item.PERIOD;
                	  dateType = "日";
                      boUrl += '&lsS'+ startTimeKey +'=' + endDate;
                      boUrl += '&lsS'+ endTimeKey +'=' + endDate;
                      boUrl += '&lsS'+ dateTypeKey +'=' + dateType;
                  } else if (targetPeriod === 'WEEK') {
                    	year = item.PERIOD.substr(0,4);
                    	week = date.substr(1);
                    	startDate = huawei.cmes.util.commons.Helper.firstDayOfWeek(parseInt(week),parseInt(year));
                    	endDate = huawei.cmes.util.commons.Helper.LastDayOfWeek(parseInt(week),parseInt(year));
                    	dateType = "周";
                        boUrl += '&lsS'+ startTimeKey +'=' + startDate;
                        boUrl += '&lsS'+ endTimeKey +'=' + endDate;
                        boUrl += '&lsS'+ dateTypeKey +'=' + dateType;
                   } else if (targetPeriod === 'MONTH') {
                    	year = item.PERIOD.substr(0,4);
                    	month = item.PERIOD.substr(item.PERIOD.length-2);
                    	dateType = "月";
                    	endDate = huawei.cmes.util.commons.Helper.LastDayOfMonth(parseInt(month),parseInt(year));
                        boUrl += '&lsS'+ startTimeKey +'=' + endDate[0];
                        boUrl += '&lsS'+ endTimeKey +'=' + endDate[1];
                        boUrl += '&lsS'+ dateTypeKey +'=' + dateType;
                   } else if (targetPeriod === 'YEAR') {
                    	year = item.PERIOD.substr(0,4);
                    	dateType = "年";
                    	endDate = huawei.cmes.util.commons.Helper.LastDayOfYear(year);
                        boUrl += '&lsS'+ startTimeKey +'=' + endDate[0];
                        boUrl += '&lsS'+ endTimeKey +'=' + endDate[1];
                        boUrl += '&lsS'+ dateTypeKey +'=' + dateType;
                   }


                  if (sap.boUrl !== undefined && sap.boUrl !== "") {
            	  var indexValue = 0;
            	  var indexKey = 0;
                  var inputValue = sap.boUrl;
                  var outputValue = "";
                  var replaceValue="";
                  var newBoUrl= "";
                  var indexKeyStart= "";;
                  var indexKeyEnd= "";;
                  var curValue= "";;
                  var othersValue= "";;
            	  while(1){
//            		  indexKey=inputValue.indexOf("&lsM",indexValue);
//                	  indexValue=inputValue.indexOf("=",indexValue);
//                	  replaceValue = inputValue.substring(indexKey+4,indexValue);
//                	  newBoUrl = "&lsM" + BOFactory.getBoDim(replaceValue,info) + inputValue.substring(indexValue) ;
//                	  outputValue += newBoUrl;
            		  indexKeyStart=inputValue.indexOf("&lsM");
            		  if(inputValue.substring(4).indexOf("&lsM")>0){
            			  indexKeyEnd=inputValue.substring(4).indexOf("&lsM");
            			  
                		  curValue = inputValue.substr(indexKeyStart,indexKeyEnd+4);
                		  othersValue = inputValue.substr(indexKeyEnd+4);
                		  
                    	  indexValue=curValue.indexOf("=");
                    	  replaceValue = curValue.substring(4,indexValue);
                    	  newBoUrl = "&lsM" + BOFactory.getBoDim(replaceValue,info) + curValue.substring(indexValue) ;
                    	  outputValue += newBoUrl;
            		  }
            		  else{
            			  curValue = inputValue;
            			  indexValue=curValue.indexOf("=");
            			  replaceValue = curValue.substring(4,indexValue);
            			  newBoUrl = "&lsM" + BOFactory.getBoDim(replaceValue,info) + curValue.substring(indexValue) ;
                    	  outputValue += newBoUrl;
            			  break; 
            		  }
                	  inputValue = othersValue;
//                	  if(inputValue.indexOf("&lsM",indexValue)<0){
//            		  break;
//            	  }
            	  }
                	  boUrl += outputValue;
                  }
                  //boUrl - URL
                  //dimension + date - name of the new open page, if not give the page will be intercepted
                  //the name should be all different, only one page with the same name can be open
                  window.open(boUrl, dimension + date);          
                }
              });
        };
	
        //TODO
        huawei.cmes.util.http.ajaxGet(url + "?KPI=" + sap.kpiSelected + "&KType=" + sap.category, boData, dataHandler);
      }


      /**
       * Rearrange The lines
       */
      //If chartSelect Name Space is undefined
      if (sap.chartSelect === undefined) {
        sap.chartSelect = {};
      }
      $(window).resize(function () {
        sap.chartSelect = {};
      });

      //If namespace of this chart is undefined
      if (sap.chartSelect[chartId] === undefined) {
        sap.chartSelect[chartId] = {
          seq: {}
        };
        svgLines.each(function (svgLineIndex) {
          sap.chartSelect[chartId].seq[svgLineIndex] = svgLineIndex;
        });
      }

      //Get the seq object
      var sapChartSeq = sap.chartSelect[chartId].seq;

      var currentLineIndex = sapChartSeq[currentLegendIndex];

      function reArrange(currentSeq, legendIndex) {
        //        console.log('currentSeq, legendIndex', currentSeq, legendIndex);
        var tempSeq = currentSeq;
        for (var seqIndex in tempSeq) {
          if (tempSeq[seqIndex] > tempSeq[legendIndex]) {
            tempSeq[seqIndex] = tempSeq[seqIndex] - 1;
          }
        }
        tempSeq[legendIndex] = lineLength - 1;
        //        console.log('tempSeq', tempSeq);
        return tempSeq;
      }

      sap.chartSelect[chartId].seq = reArrange(sapChartSeq,
        currentLegendIndex);

      var targetLine = svgLines[currentLineIndex];
      parentNode.children().remove();

      svgLines.splice(currentLineIndex, 1);

      svgLines.push(targetLine);
      parentNode.append(svgLines);

    },

    /**
     * @returns {sap.viz.ui5.Line} KPI Chart
     */
    getKPIChart: function () {
      return this._KPIChart;
    }


  });


})();
