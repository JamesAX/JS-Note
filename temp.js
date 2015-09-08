/*global jQuery:false */
/*global huawei:false */
/*global sap:false */
/*global localStorage:false */
/*global setTimeout:false */
/*global $:false */
/*global window:false */
/*global document:false */


(function () {
  "use strict";

  //import library
  jQuery.sap.declare("huawei.cmes.quality.QualityPage");
  //jQuery.sap.require("huawei.cmes.fragment.quality.Report");
  jQuery.sap.require("huawei.cmes.util.settings.Authorization");
  jQuery.sap.require("huawei.cmes.util.parameters.QualityChartsParameters");
  jQuery.sap.require("huawei.cmes.util.commons.Formatters");
  jQuery.sap.require("huawei.cmes.util.chart.Helper");
  jQuery.sap.require("huawei.cmes.util.services.Provider");
  jQuery.sap.require("huawei.cmes.util.services.Proxy");
  jQuery.sap.require("huawei.cmes.control.charts.QualityCharts");
  jQuery.sap.require("huawei.cmes.control.charts.KPIChart");
  jQuery.sap.require("huawei.cmes.control.Filter.MESFilter");
  jQuery.sap.require("huawei.cmes.util.services.Http");
  jQuery.sap.require("sap.ui.core.format.DateFormat");
  jQuery.sap.require("huawei.cmes.quality.setting.Config");

  //constant variable
  var PROXY = huawei.cmes.util.services.Proxy;
  var QUALITY_SERVICE = huawei.cmes.util.services.Provider.QualityService;
  var QUALITY_ODATA = huawei.cmes.util.services.Provider.QualityOData;
  var HTTP = huawei.cmes.util.http;
  var HELPER = huawei.cmes.util.commons.Helper;
  var CHART_HELPER = huawei.cmes.util.chart.Helper;
  var AUTHORIZATION = huawei.cmes.util.settings.Authorization;

  sap.ui.controller(
    "huawei.cmes.quality.view.QualityPage",

    /**
     * @author lWX209333
     * $("#__xmlview0--Column2ChartVBox .v-row[class*='ID_0'] text").text(':');
     *
     */
    {
      pageName: 'quality',
      onInit: function () {

        this.initCategory();
        this.initialURLs();

        this.initMappings();
        this.initGlobalTime();

        AUTHORIZATION.checkAuthorization('quality');

        /**
         * Fragments
         */
        //the fragment for the chart on column2
        this._chartDlg = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.Sub1ChartDlg", this);

        //the fragment for drop-down list of dimensions on upper part of column3
        this._dimensionDDL = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.DimensionDDL", this);

        //the fragment for all warning messages
        this._warnMsgDlg = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.WarningMsg", this);

        //the fragment for defect chart type popover
        this._defectChartTypePopover = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.DefectChartTypePopover", this);

        //the fragment for report
        this._reportPage = sap.ui.jsfragment(
          "huawei.cmes.fragment.quality.Report", this);

        if (sap.ui.getCore().byId("InformationDlg") !== undefined) {
          sap.ui.getCore().byId("InformationDlg").destroy();
        }

        //the fragment for information popover/dialog
        this.informationMsg = sap.ui.xmlfragment(
          "huawei.cmes.fragment.commons.InformationMsg", this);

        this.getView().addDependent(this.informationMsg);
        this.getView().addDependent(this._chartDlg);
        this.getView().addDependent(this._dimensionDDL);
        this.getView().addDependent(this._warnMsgDlg);
        this.getView().addDependent(this._defectChartTypePopover);
        this.getView().addDependent(this._reportPage);


        this.bus = sap.ui.getCore().getEventBus();

        //set displaying language
        this.languageSetting();

        //Initialize Quality Charts
        this.initPage();

      },

      /**
       * Ajax Get Method
       *
       * @param url
       * @param model
       * @param func
       */
      ajaxGet: HTTP.ajaxGet,
      deepClone: HELPER.deepClone,

      /**
       * [onReportOpen - open the report]
       * @param  {[type]} oEvent [description]
       * @return {[type]}        [description]
       */
      onReportOpen: function (oEvent) {
        this._reportPage.open();
      },

      /**
       * Initial Service URLs
       */
      initialURLs: function () {
        //get the 
        this._dimValueService = QUALITY_SERVICE.getm;
        this._settingService = QUALITY_SERVICE.getDimColloection;

        //URL to get all dimensions of a KPI for build filter
        this._filterDims = QUALITY_SERVICE.getv;

        //URL for tiles' data on first column
        this._column1Service = QUALITY_SERVICE.getKPIL1;

        //URL for color set on tile data
        this._column1ColorService = QUALITY_SERVICE.getKPIL1RYG;

        //URL for KPI Charts on second column
        this._column2Service = QUALITY_SERVICE.getKPIL2;

        //URL for Dimension Charts on third column
        this._column3Service = QUALITY_SERVICE.getKPIL3;

        this._kpiNameService = QUALITY_ODATA.kpiName;
      },


      /**
       * Initialize the category: network - default
       */
      initCategory: function () {
        var kpiType = huawei.cmes.util.commons.Helper
          .getURLParameters('kpiType');
        if (kpiType) {//if kpiType is exist
          if (kpiType !== '00' && kpiType !== '01') {// if kpiType is not '00' or '01', show error
            sap.ui.commons.MessageBox.alert(
              'URL Invalid Parameter Value For: kpiType');
            this._sCategory = 0;
            sap.category = this._sCategory;
          } else {//if kpiType is '00' or '01', get the key -- 0 or 1
            this._sCategory = parseInt(kpiType.charAt(1));//this._sCategory is 0 or 1
            sap.category = this._sCategory;
          }
        } else {//if kpiType is not exist
          this._sCategory = 0;
          sap.category = this._sCategory;
        }
      },

      /**
       * Index for charts display
       * @type {Number}
       */
      initIndexes: function () {

        //index for tile on column1
        this.c1 = 0;
        //index for charts on column2
        this.c2 = 0;
        //default to select the first dimension (index = 0)
        this.selectedDim = 0;
        //page size for carousel on column2
        this.sPagesize = 2; 
        //use to control the asynchronize data loading 
        this.loaded = 0; 
      },

      /**
       * KPI mapping info
       */
      initMappings: function () {
        //initial the indexs used for quality page
        this.initIndexes();

        //label colors on tiles
        this._tileColors = [];
        //use for data-binding of tiles on column1
        this._tileData = [];
        //kpi names
        this._kpiNames = [];
        this._orgKpiNames = [];

        //YAxis adjust
        this._yaxis = [];

        //Global build chart filter
        this._sqlFilter = "";

        // kpi charts on column 2
        this._kpiCharts = []; 
        // sub-dimension charts on column 3
        this._dimCharts = []; 

        //Defect charts 
        this._dimOrgValues = [];
        this._selectedDims = [];

        this._defectTypes = ["defect_phenomenon", "defect_causes"];
        this._defectIndex = 0; //select 'Defect Phenomenon' as default
        this._curDefectChart = null; //selected defect chart 
        this._defectType = "pie"; //the default defect chart type - 'pie'
        this._defectReload = true;

      },

      /**
       * languageSetting - set displaying language
       * The function is called when initial the controller
       * @return {[type]} [description]
       */
      languageSetting: function () {
        this._sLocale = localStorage.getItem('LANG-KEY') || '';
        this.oBundle = jQuery.sap.resources({
          url: "i18n/messageBundle.properties",
          locale: this._sLocale
        });
        //set the language
        if (sLocale === 'en-US') {
          sap.ui.getCore().getConfiguration().setLanguage('en-US');
        } else {
          sap.ui.getCore().getConfiguration().setLanguage('zh-CN');
        }

      },


      /**
       * Generate tiles and charts on the page
       */
      onAfterRendering: function () {

        this.initialSettings();

        var that = this;

        //show selected start date, end date, and period(granularity of the statistical time) of the query
        //in proper format on UI
        this.showDateSelected();
        
        var execToolTip = function () {
          // alert('Working Now!');
          that.initTooltip();
        };
        setInterval(execToolTip, 2000);

        //when the window is resized
        $(window).resize(function () {
          //the chart on column2 will be reloaded based on the size of the window
          that.loadColumn2Carousel();
          that.adjustTileIconShown();
        });
      },

      /**
       * adjustTileIconShown description
       * @return {none}
       */
      adjustTileIconShown: function () {
        var id = '#' + this.byId('tile-list').getId();
        if ($(window).width() < 1195) {
          setTimeout(function () {
            $(id).find('.sapUiIcon').fadeOut();
          }, 300);
        } else {
          setTimeout(function () {
            $(id).find('.sapUiIcon').fadeIn();
          }, 300);
        }
      },

      /**
       * initTooltip description
       * @return {none}
       */
      initTooltip: function () {
        $('.v-row').hover(function (evt) {
          sap.evt = evt;
          var title = evt.currentTarget.querySelector('title');
          var text = evt.currentTarget.querySelector('text');
          var showtext = '';

          var posotionX = evt.clientX;
          var posotionY = evt.clientY - 30;

          if (title) {
            showtext +=
              '<span class="tooltip" style="left:' +
              posotionX + 'px;top:' + posotionY + 'px">' + title.textContent +
              '</span>';
          } else {
            if (text) {
              showtext +=
                '<span class="tooltip" style="left:' +
                posotionX + 'px;top:' + posotionY + 'px">' + text.textContent +
                '</span>';
            }
          }

          $('body').append(showtext);

        }, function () {
          $('.tooltip').remove();
        });
        $(window).bind('mousewheel DOMMouseScroll', function (event) {
          $('.tooltip').remove();
        });
      },


      /**
       * [initialSettings description]
       * @return {[type]} [description]
       */
      initialSettings: function () {
        $('#idViewRoot--idApp-MasterBtn').remove();
        var kpiType = huawei.cmes.util.commons.Helper
          .getURLParameters('kpiType');
        // console.log(kpiType);
        if (kpiType === '00') {
          this.byId('CategorydecriptionSWT').setState(false);
        } else if (kpiType === '01') {
          this.byId('CategorydecriptionSWT').setState(true);
        }
      },


      /**
       * Initialize Quality Charts
       */
      initPage: function () {
        /*      
        var inforCollection = huawei.cmes.util.settings.Authorization.getLoginInfor("PAGE","HOME");
        if(inforCollection === false){
            var msg = "LOGIN_FAILED";
            sap.ui.getCore().byId("information-msg").setText(this.oBundle.getText(msg));
              this.informationMsg.open();
              throw new Error("Login failed: "+ this.oBundle.getText(msg));
        }
        
        set default start/end/period on global time filter
    */

        //before data comes back form backend:
        //set busy for quality component
        sap.ui.getCore().byId("QualityComponent").setBusy(true);
        //set all charts invisible
        this.getView().byId("ChartRow").setVisible(false);
        //set the switch button on right upper corner disabled
        sap.ui.getCore().byId('__xmlview0--CategorydecriptionSWT').setEnabled(
          false);

        //If succeed to get all kpi names, drawPage
        this.getAllKPINames();
        setInterval(function () {
          	HELPER.checkSessionExpiration();
        }, 1000);
      },


      /**
       * initGlobalTime - initial the query time(start&end date) and period (granularity)
       * The function is called when initial the controller
       * @return {none}
       */
      initGlobalTime: function () {
        //clear the temporary period
        this._tmpPeriod = null;
        //clear the temporary start date
        this._tmpStartDate = null;
        //clear the temporary end date
        this._tmpEndDate = null;

        //once the start date is initialied, don't run this function again
        if (this._tileStartDate !== undefined) return;

        //get current date
        var curDate = new Date();

        //HELPER.getLastMonth(curDate);
        //get current year
        var eYear = curDate.getFullYear();
        //get current month
        var eMonth = curDate.getMonth() + 1;
        //get current date
        var eDay = curDate.getDate();

        //get current date
        var todayDate = new Date();
        //get current year
        var startYear = todayDate.getFullYear();
        //get current month - 1
        var startMonth = todayDate.getMonth();//0-11

        var thisMonth15 = startYear + '/' + (startMonth + 1) + '/15';

        //14Month Ago
        var startTime = new Date(new Date(thisMonth15).getTime() - 2592000000 * 13);//2592000000 * 13 ?
        var firstDayOfMonth = new Date(new Date(startTime).setDate('01'));

        var sMonth = firstDayOfMonth.getMonth() + 1;
        var sYear = firstDayOfMonth.getFullYear();
        var sDay = "01";

        //两位数
        eMonth = eMonth > 9 ? eMonth : "0" + eMonth;
        sMonth = sMonth > 9 ? sMonth : "0" + sMonth;
        eDay = eDay > 9 ? eDay : "0" + eDay;


        //yyyy-mm-dd
        this._globalEndDate = eYear + "-" + eMonth + "-" + eDay;
        this._globalStartDate = sYear + "-" + sMonth + "-" + sDay;

        this._tileStartDate = this._globalStartDate;
        this._tileEndDate = this._globalEndDate;
        this._globalPeriod = "MONTH";
        this._globalPeriodLegend = "ActualValue";
        
        sap.startDate = this._tileStartDate;
      },


      /*******************************************************************
       * *****Data Binding
       ******************************************************************/
      /**
       * getAllKPINames - get KPI Names from backend, this function is called when initial the page
       * The function is called when initial the Quality Page
       * @return {none}
       */
      getAllKPINames: function () {
        var that = this;

        //set the request URL
        var oDataURL = huawei.cmes.util.services.Proxy
          .XsodataProxy(this._kpiNameService);
        var oFilter =
          "/master_kpi?$filter=COMPONENT_KEY eq 'QUALITY' and KPI_TYPE eq '" +
          this._sCategory + "' and ENABLE_TAG eq '1'";

        //the array use to save temparory data
        var info = [];

        //the callback function
        var dataHandler = function (oData, info) {
          //since the data comes back:
          //set the UI available
          sap.ui.getCore().byId("QualityComponent").setBusy(false);
          //display all charts
          that.getView().byId("ChartRow").setVisible(true);
          info = oData.d.results;

          for (var i = 0; i < info.length; i++) {
            //only the data with COMPONENT_ID = 1 is useful
            if (info[i].COMPONENT_ID != 1) {
              continue;
            }
            //info[i].KPI_TYPE: 0 Network, 1 Terminal
            //that._kpiNames stores kpinames 
            if (that._kpiNames[info[i].KPI_TYPE] === undefined) {
              //if no kpi names for KPI_TYPE(0 OR 1) have been saved, create corresponding array
              that._kpiNames[info[i].KPI_TYPE] = [];
            }

            // e.g. 0: material quality, 1: process quality , 2: customer quality
            var sbIndex = info[i].SUB_COMPONENT_ID.substr(
              info[i].SUB_COMPONENT_ID.length - 1, 1);
            sbIndex = parseInt(sbIndex) - 1;
            if (sbIndex < 0) {
              continue;
            };

            //if no kpi names for corresponding sub-component, 
            //e.g., Network, material quality - that._kpiNames[0][0],
            //create array for it
            if (that._kpiNames[info[i].KPI_TYPE][sbIndex] === undefined) {
              that._kpiNames[info[i].KPI_TYPE][sbIndex] = [];
            }

            //info[i].KPI_TYPE - network/terminal
            //sbIndex - incoming material quality, in process quality.....
            //00315717 change TPY into FPY while network;change TPY into PY while terimal
            var KPI_KEY = info[i].KPI_KEY;
            if (KPI_KEY === 'TPY' && that._sCategory === 0) {
              KPI_KEY = 'FPY';
            } else if (KPI_KEY === 'TPY' && that._sCategory === 1) {
              KPI_KEY = 'PY';
            }
            that._kpiNames[info[i].KPI_TYPE][sbIndex].push(KPI_KEY);
          }

          //draw page
          that.drawPage();
          $('.v-clippath').remove();
        };

        //get data form backend
        this.ajaxGet(oDataURL + oFilter, info, dataHandler);
      },


      /**
       * getTileData data binding for tiles on first column
       * The function is called when load tile boxes on UI
       */
      getTileData: function () {
        var that = this;
        
        //get tile vbox from ui and set empty json model for it
        var tileVBox = this.getView().byId("TileVBox");
        var oModel = new sap.ui.model.json.JSONModel();
        tileVBox.setModel(oModel);


        /*  setTimeout(tileVBox.setBusy(false), 30 * 1000);*/

        //compose request url
        var kpiReqURL = PROXY.XsjsProxy(this._column1Service);
        kpiReqURL +=
          "?Component=QUALITY" +
          "&Datef=" + this._tileStartDate +
          "&Datet=" + this._tileEndDate +
          "&KType=" + this._sCategory;

        //callback function
        var kpiDataHandler = function (oData, tileVBox) {
          //use to save model data
          var tileData = [];
          //use to save sub component names
          var subComps = [];
          //icons for sub components
          var icons = huawei.cmes.quality.setting.Config.tileIcons;
          //the index indicates which sub component the kpi belongs to
          var index = 0;
          //the temporary tile object
          var tile = {};
          //use to save the current tile unit
          var tileUnit = '';

          for (var i = 0; i < oData.length; i++) {
            //get index of component
            index = subComps.indexOf(oData[i].SUB_COMPONENT_NAME);
            //get hte tile unit
            tileUnit = oData[i].UNIT === "PCS" ? that.oBundle.getText("PCS_Q") : oData[i].UNIT;
            
            //if tile is not exist (index < 0), add it into the subComps array
            if (index < 0) {
              subComps.push(oData[i].SUB_COMPONENT_NAME);
              //generate the tile object based on the data-binding need
              tile = {
                "SUB_COMPONENT_NAME": oData[i].SUB_COMPONENT_NAME,
                "ICON": icons[subComps.length - 1],
                "KPIs": [{
                  "KPI_NAME": that.oBundle.getText(oData[i].KPI_NAME),
                  "KPI_VALUE": oData[i].KPI_VALUE,
                  "UNIT": tileUnit
                }]
              };
              //add the new tile object into the tileData array
              tileData.push(tile);
            } else {
              //if tile is exist, update it
              tile = tileData[index];
              //add current KPI relative info into the corresponding sub component
              tile.KPIs.push({
                "KPI_NAME": that.oBundle.getText(oData[i].KPI_NAME),
                "KPI_VALUE": oData[i].KPI_VALUE,
                "UNIT": tileUnit
              });
            }
          }

          //that._sCategory - network / terminal
          tileVBox.getModel().setData(tileData);
          //save the tile data of current category, for example network, to improve the performance
          that._tileData[that._sCategory] = tileData;
          //Set the tile value color based on loaded data
          that.setTileColor();
          tileVBox.setBusy(false);
          setTimeout(function () {
            that.adjustTileIconShown();
            $('.v-clippath').remove();
          }, 200);
        };

        //if the data of the tile is not exist, request for the data
        if (this._tileData[this._sCategory] === undefined) {
          tileVBox.setBusy(true);
          this.ajaxGet(kpiReqURL, tileVBox, kpiDataHandler);
        } else {
        //if the data of the tile is exist, update the tile
          tileVBox.getModel().setData(this._tileData[this._sCategory]);
         //set tile color based on the data from backend
          this.setTileColor();
        }

      },

      /**
       * setTileColor set color for kpi values on tiles based on the data
       * The function is called when bind data for tiles on column1
       */
      setTileColor: function () {
        var tileVBox = this.getView().byId("TileVBox");
        var tileItems = tileVBox.getItems()[0].getItems();

        for (var i = 0; i < tileItems.length; i++) {
          //set the css class for the last tile
          if (i === tileItems.length - 1) {
            //the css  class for last tile item is special
            //the bottom border is shown for last item
            tileItems[i].addStyleClass("last-tile-itme");
          } else {
            tileItems[i].addStyleClass("showborder-tile-item");
          }

          //initial the kpi and class name
          var kpiName = '',className = '';
          //set the defualt color code - 3: Green 
          var colorCode = 3;

          //get the sub componnet box which contains the kpi rows
          var tilePerComp = tileItems[i].getContent()[0].getItems()[1].
          getItems()[1].getItems();
          //loop every kpi rows for each sub component
          for (var j = 0; j < tilePerComp.length; j++) {
            //kpi name of current row
            kpiName = tilePerComp[j].getContent()[0].getText().split(':')[0];
            //if the color info cames back, set the color code
            if (this._tileColors[this._sCategory][kpiName] !== undefined) {
              colorCode = parseInt(this._tileColors[this._sCategory][kpiName]);
              switch (colorCode) {
                //set class name based on the color code
              case 0:
                className = "tile-kpi-value-red";
                break;
              case 1:
                className = "tile-kpi-value-yellow";
                break;
              case 2:
                className = "tile-kpi-value-green";
                break;
              }
              tilePerComp[j].getContent()[1].addStyleClass(className);
            }
          }

        }
        //high light the first column of the tile
        //this.c1 - the index of selected tile on column1
        this.highlightOneTile(this.c1);

      },

      /**
       * getTileColor request backend for the color of kpi values
       * The function is called when load tile boxes on UI
       */
      getTileColor: function () {
        //get the tile vbox
        var tileVBox = this.getView().byId("TileVBox");
        var that = this;
        var kpiName = '';

        //callback function
        var kpiColorDataHandler = function (oData) {

          for (var i = 0; i < oData.length; i++) {
            //get the kpi name
            kpiName = that.oBundle.getText(oData[i].KPI_NAME);
            //save the color code in corresponding position
            //e.g. Network, TPY , red - that._tileColors[0][TPY] = 0
            that._tileColors[that._sCategory][kpiName] = oData[i].RYG;
          }

          //set class for corresponding KPI value
          that.tileValueFormatter(that, that._tileColors[that._sCategory]);
          $('.v-clippath').remove();
        };

        //if no color code is fetched from backend for current category, send request
        if (this._tileColors[this._sCategory] === undefined) {
          this._tileColors[this._sCategory] = [];
          var kpiColorReqURL = PROXY.XsjsProxy(this._column1ColorService);
          kpiColorReqURL +=
            "?Component=QUALITY" +
            "&Datef=" + this._tileStartDate +
            "&Datet=" + this._tileEndDate +
            "&KType=" + this._sCategory;
          //request data from backend
          this.ajaxGet(kpiColorReqURL, tileVBox, kpiColorDataHandler);
        }


      },

      /**
       * setColumn2ChartModel - set model data for KPI chart on column2
       * 为第二列的图集，滚动组图请求并绑定数据
       * @param {[chart]} oChart - kpi chart
       */
      setColumn2ChartModel: function (oChart) {
        var that = this;

        //如果当前KPI，在所选时间颗粒度下无意义，则赋予空值
        if (!this.isValidPeriod(oChart.KPI, this._globalPeriod)) {
          oChart.getModel().setData('');
          //mark this chart is loaded
          that.loaded++;
          //check whether all charts are loaded
          that.isFullLoaded();
          return;
        }
        //set busy on current kpi chart
        oChart.getKPIChart().setBusy(true);

        // kpi name for current chart
        var kpiName = oChart.KPI;

        //generate request URL
        kpiName = jQuery.sap.encodeURL(kpiName);
        var oFilter = "?KPI=" + kpiName + "&KType=" + this._sCategory +
          "&Prd=" + this._globalPeriod + "&Datef=" + this._globalStartDate +
          "&Datet=" + this._globalEndDate;

        var reqURL = PROXY.XsjsProxy(this._column2Service);
        reqURL += oFilter;

        //callback function
        //oData - Array of data that from backend
        //oChart - current kpi chart
        var dataHandler = function (oData, oChart) {

          //the data sample:
          //oData = [{P_VALUE:99.325,C_VALUE:0,T_VALUE:99,UNIT:'%',PERIOD:'2014-01'},{P_VALUE:99.431,C_VALUE:99.387,T_VALUE:99,UNIT:'%',PERIOD:'2014-02'},{P_VALUE:99.302,C_VALUE:99.349,T_VALUE:99,UNIT:'%',PERIOD:'2014-03'},{P_VALUE:99.29,C_VALUE:99.332,T_VALUE:99,UNIT:'%',PERIOD:'2014-04'},{P_VALUE:99.259,C_VALUE:99.315,T_VALUE:99,UNIT:'%',PERIOD:'2014-05'},{P_VALUE:99.347,C_VALUE:99.321,T_VALUE:99,UNIT:'%',PERIOD:'2014-06'},{P_VALUE:99.238,C_VALUE:99.308,T_VALUE:99,UNIT:'%',PERIOD:'2014-07'},{P_VALUE:99.235,C_VALUE:99.297,T_VALUE:99,UNIT:'%',PERIOD:'2014-08'},{P_VALUE:99.187,C_VALUE:99.289,T_VALUE:99,UNIT:'%',PERIOD:'2014-09'},{P_VALUE:'',C_VALUE:99.289,T_VALUE:99,UNIT:'%',PERIOD:'2014-10'},{P_VALUE:'',C_VALUE:99.289,T_VALUE:99,UNIT:'%',PERIOD:'2014-11'},{P_VALUE:'',C_VALUE:99.289,T_VALUE:99,UNIT:'%',PERIOD:'2014-12'},{P_VALUE:'',C_VALUE:99.289,T_VALUE:99,UNIT:'%',PERIOD:'2015-01'}];   

          //set model data for oChart
          oChart.getModel().setData(oData);

          //set unit
          var unit = "";
          //get the fragment of the chart
          var frag = oChart.getParent().getParent().getParent();
          //if the unit info is back:
          if (oData !== undefined && oData[0] !== undefined && oData[0].UNIT !== undefined) {
            unit = oData[0].UNIT === "PCS" ? that.oBundle.getText("PCS_Q") : oData[0].UNIT;
            //save unit with the chart
            oChart.setUnit(unit);
            //get show text of the unit
            unit = that.oBundle.getText("UNIT") + ": " + unit;
            //set the show text on UI
            frag.getRows()[1].getCells()[0].getContent()[0].setText(unit);
          }

          //update model data
          setTimeout(function () {
            oChart.getKPIChart().getDataset().updateData();
          }, 10);
          
          //Set first legend for dimension chart
          that.setDimChartLegend();
          
          CHART_HELPER.adjustChartYAxis(oChart.getKPIChart());
          //          CHART_HELPER.adjustChartPeriod(that._globalPeriod,that._globalStartDate,that._globalEndDate,oChart.getKPIChart());
          oChart.getKPIChart().setBusy(false);

          //mark this chart as loaded
          that.loaded++;
          //check whether all charts are loaded
          that.isFullLoaded();
          $('.v-clippath').remove();
        };

        this.ajaxGet(reqURL, oChart, dataHandler);
        
      },


      /**
       * setColumn3ChartModel - get model data for Charts in Column3
       * @param {[chart]} oChart - dimension chart
       */
      setColumn3ChartModel: function (oChart) {
        var that = this;
        //this.c1 - the index of selected sub-component on column1
        //this.c2 - teh index of selected KPI chart on column2
        //kpiChart - huawei.cmes.control.charts.KPIChart
        var kpiChart = this._kpiCharts[this.c1][this.c2];
        //get the original data model for current selected dimension 
        //this.selectedDim - the index of selected dimension
        //kpiChart.dimModels - Array - use to save all dimensions' models to reduce the reload time
        var orgDimModel = kpiChart.dimModels[this.selectedDim];

        //get name of selected dimension
        //kpiChart.dimNames - Array - use to save all dimension names of the KPI
        var curDimNames = kpiChart.dimNames[this._sCategory];
        if (curDimNames === undefined) {
          //if no dimension name get from backend and saved with the KPI chart, return;
          return;
        }

        //get the selected dimension name
        var curDim = curDimNames[this.selectedDim];
        //get the KPI name
        var kpiName = this._kpiNames[this._sCategory][this.c1][this.c2];
        //set empty model data
        oChart.getModel().setData('');

        //if the period(granularity of time) of the KPI is not valid 
        if (!this.isValidPeriod(kpiName, this._globalPeriod)) {
          //set empty model data
          oChart.getModel().setData('');
          //mark this chart as loaded
          this.loaded++;
          //check whether all charts are loaded
          this.isFullLoaded();
          return;
        }

        //callback function
        var dataHandler = function (oData, oChart) {
          //deep clone the data to kpiChart.dimModels
          kpiChart.dimModels[that.selectedDim] = that.deepClone(oData);

          //Delete the empty data
          var cnt=0;
          var tmp = "";
          for(cnt;cnt<oData.length;cnt++){
        	  if(oData[cnt].DIMENSION !== "空" || (oData[cnt].DIMENSION === "空" && oData[cnt].KPI_VALUE !== "")){
        		  //save the available data
              tmp = oData[cnt].DIMENSION;
        		  break;
        	  }
          }
          cnt=0;
          //set the DIMANSION for all "空" and "" data
          if(tmp !== ""){
        	  for(cnt;cnt<oData.length;cnt++){
            	  if(oData[cnt].DIMENSION === "空" &&  oData[cnt].KPI_VALUE === ""){
            		  oData[cnt].DIMENSION = tmp;
            	  }
              }  
          }
          
          //Set Data model of dimension chart
          that.setDimChartModel(oChart, oData);

          //Set Data model of defect chart
          that.setDefectModel(that._curDefectChart, oData);
          
          //Set first legend for dimension chart
          that.setDimChartLegend();
          
          //Set unit for dimension chart
          //that.setDimChartUnit(oChart);

          /*oChart.setBusy(false);
          that._curDefectChart.setBusy(false);*/

          //Adjust chart x,y axis;
          //          CHART_HELPER.adjustChartPeriod(that._globalPeriod, that._globalStartDate,
          //            that._globalEndDate, oChart, "DIMENSION");
          CHART_HELPER.adjustChartYAxis(oChart);

          //mark the chart as loaded
          that.loaded++;
          //check whether all charts are loaded
          that.isFullLoaded();
          setTimeout(function () {
            $('.v-clippath').remove();
          }, 50);
        };

        if (this._selectedDims[this.selectedDim] === undefined) {
          this._selectedDims[this.selectedDim] = [];
        }


        //if model is not exist, request for data
        if (orgDimModel === undefined) {
          //oChart - dimension chart
          oChart.setBusy(true);
          this._curDefectChart.setBusy(true);

          var oFilter =
            "?Dimension=" + curDim + "&KPI=" + kpiName + "&Filter=" + this._sqlFilter +
            "&Datef=" + this._globalStartDate + "&Datet=" + this._globalEndDate +
            "&Prd=" + this._globalPeriod + "&KType=" + this._sCategory;
          sap.boDimension = sap.oBundle.getText(curDim);

          var reqURL = PROXY.XsjsProxy(this._column3Service) + oFilter;
          this.ajaxGet(reqURL, oChart, dataHandler);

        } else {//if model is exist, update the model

          //Set Data model of dimension chart
          this.setDimChartModel(oChart, orgDimModel);

          //Set unit for dimension chart
          this.setDimChartUnit(oChart);

          //Set Data model of defect chart
          this.setDefectModel(this._curDefectChart, orgDimModel);
          //Adjust chart x,y axis;
          //          CHART_HELPER.adjustChartPeriod(that._globalPeriod, that._globalStartDate,
          //            that._globalEndDate, oChart, "DIMENSION");
          CHART_HELPER.adjustChartYAxis(oChart);
          setTimeout(function () {
            $('.v-clippath').remove();
          }, 50);
        }
        $('.v-clippath').remove();
      },
      
    
    /**
     * setDimChartLegend - Load chart legend value according to choose period on page 00315717herry
     */
      setDimChartLegend: function () {
        //var oData = oChart.getModel().oData;
        if (this._globalPeriod==='YEAR'){
            this._globalPeriodLegend='CurrentYearValue';
        } else if (this._globalPeriod==='Quartor'){
            this._globalPeriodLegend='CurrentQuartorValue';
        } else if (this._globalPeriod==='WEEK'){
            this._globalPeriodLegend='CurrentWeekValue';
        } else if (this._globalPeriod==='DAY'){
            this._globalPeriodLegend='CurrentDayValue';
        } else {
            this._globalPeriodLegend='ActualValue';
        } 
        var Legendname = this.oBundle.getText(this._globalPeriodLegend);
        //if (oData !== undefined ) {
            $("#__xmlview0--Column2ChartVBox .v-row[class*='ID_0'] text").text(Legendname);  
        //}

      },
      
      
      /**
       * [setDimChartUnit - Load chart unit on page]
       * @param {sap.viz.ui5.Line} oChart - the defect chart
       */
      setDimChartUnit: function (oChart) {
        //get the model data of the chart
        var oData = oChart.getModel().oData;
        if (oData !== undefined && oData[0].UNIT !== undefined) {
          //get the unit if the model data is available
          var unit = oData[0].UNIT === "PCS" ? this.oBundle.getText(oData[0].UNIT + "_Q") : oData[0].UNIT;
          //get the show text of the unit
          unit = this.oBundle.getText("UNIT") + ": " + unit;
          //get the fragment of current defect chart
          var frag = oChart.getParent().getParent();
          //set the show text for unit on fragment
          frag.getItems()[0].setText(unit);
        }

      },

      
      /**
       * [setDimChartModel - Build and set data model for dimension chart]
       * The function is called when draw dimension chart on column3
       * @param {vizchart} oChart - dimension chart
       * @param {Array} oData  - model data from backend
       */
      setDimChartModel: function (oChart, oData) {
        //build model for dimension drop-down list;

        //create Array for the orignal model data of selected dimension
        //this.selectedDim - the index of selected dimension tab
        //this._dimOrgValues - to save original data of dimension drop-down list
        this._dimOrgValues[this.selectedDim] = [];

        var dimValues = [];
        //the model data for drop-down list
        var dimList = [];
        //generate dimList
        for (var i = 0; i < oData.length; i++) {
          //only get the data items that KPI_TAG === "0"
          if (oData[i].KPI_TAG != "0") continue;
          if (dimValues.indexOf(oData[i].DIMENSION) < 0) {
            dimValues.push(oData[i].DIMENSION);
            dimList.push({
              DIMENSION: oData[i].DIMENSION
            });
          }
        }

        this._dimOrgValues[this.selectedDim] = dimList;

        var orgData = this.deepClone(oData);
        var results = this.generateDimModel(orgData,
          this._selectedDims[this.selectedDim]);
        
        //set model data for dimension chart
        oChart.getModel().setData(results);

      },

      //TODO
      //TODO
      //TODO
      //Filter dimension data based on selected dimensions
      //z00315717   keep the automatic completed data period  
      generateDimModel: function (jsonData, dimValues) {
        if (jsonData[0] === undefined || dimValues === undefined) return
        jsonData;
      //Delete the empty data
        var cnt=0;
        var tmp = "";
        for(cnt;cnt<jsonData.length;cnt++){
      	  if(jsonData[cnt].DIMENSION !== "空" || (jsonData[cnt].DIMENSION === "空" && jsonData[cnt].KPI_VALUE !== "")){
      		  tmp = jsonData[cnt].DIMENSION;
      		  break;
      	  }
        }
        cnt=0;
        if(tmp !== ""){
      	  for(cnt;cnt<jsonData.length;cnt++){
          	  if(jsonData[cnt].DIMENSION === "空" &&  jsonData[cnt].KPI_VALUE === ""){
          		jsonData[cnt].DIMENSION = tmp;
          	  }
            }  
        }
        /**
         * KPI_TAG
         * 0 DImension
         * 1 Defect Type Detail
         * 2 Defect Reason Detail
         */
        for (var i = 0; i < jsonData.length; i++) {
          if (jsonData[i].KPI_TAG !== "0" && jsonData[i].KPI_TAG !== "") {
            jsonData.splice(i, 1);
            i--;
          } else if (dimValues.length > 0 && dimValues.indexOf(jsonData[i].DIMENSION) <
            //else if (dimValues.length > 0 && dimValues.indexOf(jsonData[i].DIMENSION) <

            0) {
        	  if (jsonData[i].DIMENSION !== "空") { //z00315717
        	  jsonData.splice(i, 1);
              i--;
            }
        	  else if(jsonData[i].DIMENSION  === "空" && jsonData[i].KPI_VALUE !==""){
        	  jsonData.splice(i, 1);
              i--;
        	 }
        	  else if(jsonData[i].DIMENSION  === "空" && jsonData[i].KPI_VALUE ===""){
        		  jsonData[i].DIMENSION = dimValues[0];
                  i--;
            }
          }
        }
        return jsonData;
      },

    
      /**
       * setDefectModel - Build and set data model for defect charts
       * The function is called when draw defect chart on column3
       * @param {vizchart} oChart - defect chart
       * @param {Array} oData - model data for defect chart
       */
      setDefectModel: function (oChart, oData) {
        //c1 for first column, c2 for second column
        var kpiName = this._kpiNames[this._sCategory][this.c1][this.c2];
        //if the kpi is not valid with current period, set empty model data
        if (!this.isValidPeriod(kpiName, this._globalPeriod)) {
          oChart.getModel().setData('');
          return;
        }

        //set original model data of defect chart
        var orgData = this.deepClone(oData);
        //get final defect chart model data
        var results =
          this.generateDefectModel(
            orgData,
            this._selectedDims[this.selectedDim],
            this._defectIndex);

        //set model data
        var defectModel = oChart.getModel();
        defectModel.setData(results);
        oChart.setModel(defectModel);
      },

      /**
       * generateDefectModel - generate model data of defect chart
       * The function is called when set model data of defect
       * @param  {Array} jsonData   - json data from backend
       * @param  {Array} dimValues  - selected dimension names
       * @param  {String} defectIndex - the index of selected defect type
       * @return {Array}  - the model data of defect chart
       */
      generateDefectModel: function (jsonData, dimValues, defectIndex) {
        //if no model data is available, do nothing
        if (jsonData[0] === undefined || dimValues === undefined) {
          return jsonData;
        }

        var pos = [];
        //defect type: 
        //KPI_TAG = 1 - defect phenomenon, 
        //KPI_TAG = 2 - defect causes
        var defects = ["1", "2"]; 
        var index = 0;

        //filter out all data of current defect type
        var defectData = jsonData.filter(function (obj) {
          if (obj.KPI_TAG === defects[defectIndex])
            return true;
          else
            return false;
        });

        //filter out all selected dimension data
        if (dimValues.length !== 0) {
          defectData = defectData.filter(function (obj) {
            //keep the selected dimension data
            if (jQuery.inArray(obj.DIMENSION, dimValues) > -1)
              return true;
            else
              return false;
          });
        }

        //loop defect data to get the total defect value(defect numbers) of each defect type
        //defectData - Array - all defect data for selected dimension
        for (var i = 0; i < defectData.length; i++) {
          //get the position of the first item with value:defectData[i].DEFECT
          if (pos[defectData[i].DEFECT] === undefined) {
            pos[defectData[i].DEFECT] = i;
            continue;
          }

          //get index of the item with value defectData[i].DEFECT ocurrs for the first time 
          index = pos[defectData[i].DEFECT];
          //accumulate KPI_VALUE(defect numbers) of items with defectData[i].DEFECT on this position(index)
          defectData[index].KPI_VALUE = parseInt(defectData[index].KPI_VALUE) +
            parseInt(defectData[i].KPI_VALUE);
          //once the KPI_VALUE is added to defectData[index].KPI_VALUE
          //remove the item and minus i
          defectData.splice(i, 1);
          i--;
          continue;

        }

        //sort function - sort KPI_VALUE in descending order
        defectData.sort(function (obj1, obj2) {
          return parseInt(obj2.KPI_VALUE) - parseInt(obj1.KPI_VALUE);
        });

        //loop to calculate value for Plato chart
        //defectData - Array - defect number is accumulated per defect type
        //BOLA_VALUE - total defect numbers
        for (var j = 0; j < defectData.length; j++) {
          if (j - 1 < 0)
          //if current item is the first in the Array, just add KPI_VALUE to BOLA_VALUE
            defectData[j].BOLA_VALUE = parseInt(defectData[j].KPI_VALUE);
          else
          //if current item is not the first in the Array, accumulate the KPI_VALUE(defect number) to BOLA_VALUE
            defectData[j].BOLA_VALUE = defectData[j - 1].BOLA_VALUE +
            parseInt(defectData[j].KPI_VALUE);
        }

        //loop to set BOLA_VALUE to every defect type
        for (var m = 0; m < defectData.length; m++) {
          //set the BOLA_VALUE for each defect type
          //BOLA_VALUE - the percentage of each defect type
          //defectData[defectData.length - 1].BOLA_VALUE - save the total defect numbers of all defect types
          defectData[m].BOLA_VALUE = (defectData[m].BOLA_VALUE / defectData[
            defectData.length - 1].BOLA_VALUE)
            .toFixed(4).slice(0, 4) * 100;
        }
        //return model data of defect chart
        return defectData;

      },

      /*******************************************************************
       * *****Generate Charts
       ******************************************************************/

      /**
       * drawPage - Generate all tiles and charts on Quality Page
       * The function is called when initialize quality page or switch category
       */
      drawPage: function () {
        //load tile boxes on column1
        this.loadTileBoxes();
        //generate KPI charts and dimension chart on column2 and column3
        this.drawCharts();
      },


      /**
       * loadTileBoxes - Generate tile boxes on column1
       */
      loadTileBoxes: function () {

        //clear charts info of ex-category
        //this.c1 - the index of selected tile on column1
        this.c1 = 0;
        //this.c2 - the index of selected kpi chart on column2
        this.c2 = 0;
        //empty the array of KPI charts
        this._kpiCharts = [];
        //get the data for tiles on column1
        this.getTileData();
        //get color info of the tiles on column1
        this.getTileColor();

      },

      /**  
       * drawCharts - Generate charts on column 2 and 3
       */
      drawCharts: function () {
        //the number of kpi charts that have been loaded
        this.loaded = 0;
        //draw KPI charts on column2
        this.drawColumn2Charts();
        //draw dimension chart on column3
        this.drawColumn3Charts();
        $('.v-clippath').remove();
      },

      /**
       * Generate charts on column 2 when click corresponding tile
       */
      drawColumn2Charts: function () {
        // remove existing charts and mapping info of column2,3

        //this.c1 - the index of selected tile on column1
        var selectedTile = this.c1;

        //whether the charts for this tile have been created
        if (this._kpiCharts[selectedTile] === undefined || this._kpiCharts[
          selectedTile].length === 0) {
          //create array for selected tile(sub-component) KPI charts
          this._kpiCharts[selectedTile] = [];

          // Get the kpi names of selected category - subcomponent;
          // e.g. get all kpi names belongs to network - material quliaty - this._kpiNames[0][0]
          var kpiTitles = this._kpiNames[this._sCategory][selectedTile];

          // Generate KPI Charts on column 2
          for (var i = 0; i < kpiTitles.length; i++) {
            //judge if the chart has been created
            if (this._kpiCharts[selectedTile][i] === undefined) {
              //if KPIChart is undefined, create one
              var kpiChart = new huawei.cmes.control.charts.KPIChart({
                title: kpiTitles[i],
                category: this._sCategory,
                period: this._globalPeriod
              });
              //attach browser click event to the KPI chart
              kpiChart.getKPIChart().attachBrowserEvent("click", this.onKPISelect,
                this);
              //set chart model
              var oModel = new sap.ui.model.json.JSONModel();
              kpiChart.setModel(oModel);

              //save the chart to array this._kpiCharts
              //this._kpiCharts[sub-component index][index of selected kpi chart]
              this._kpiCharts[selectedTile][i] = kpiChart;
              //set model data for current kpi chart
              this.setColumn2ChartModel(this._kpiCharts[selectedTile][i]);
            }
          }

        } else {
          //if all kpi charts are existed, mark all charts as loaded
          this.loaded = this._kpiCharts[selectedTile].length;
        }
        //load all kpi charts on carousel on column2
        this.loadColumn2Carousel();
      },

      /**
       * Create sub-dimension and defect charts on column 3
       */
      drawColumn3Charts: function () {
        // remove existing charts and mapping info of column 3 
        this._dimCharts = [];
        this._curDefectChart = null;

        //data values for dimension drop-down list
        this._dimOrgValues = [];

        //selected dimensions
        this._selectedDims = [];

        //selected tab of dimensions charts on column 3 
        this.selectedDim = 0;

        //the index of selected defect tab on column 3 
        this._defectIndex = 0;

        // Create chart tab on bottom of column 3 for defects charts
        this.drawDefectChartTabBar();
        // default chart type is pie chart
        this._curDefectChart = this.drawDefectChart("pie");

        // Create chart tab on top of column 3 for sub-dimension charts
        this.drawDimTabBar();

        //set model data for dimension chart on column2
        this.setColumn3ChartModel(this.drawDimCharts());
      },

      /**
       * Create chart tab for sub-dimension charts
       */
      drawDimTabBar: function () {
        //get container of tab bar for dimension charts on column3
        var oChartContainer = this.getView().byId("Column3ChartContainer1");
        oChartContainer.removeAllItems();

        //get current KPIChart
        //this.c1 - index of selected tile on column1
        //this.c2 - index of selected KPI chart on column2
        var curKPIChart = this._kpiCharts[this.c1][this.c2];
        //get current KPI name
        var curKPI = curKPIChart.KPI;

        //dimensions - array - dimension names of current KPI
        var dimensions = curKPIChart.dimNames[this._sCategory];
        //if no dimension name is loaded, do nothing
        if (dimensions === undefined) {
          return;
        }

        //loop to create dimension tabs
        //dimensions - array - dimension names of current KPI
        for (var i = 0; i < dimensions.length; i++) {
          //set tab id
          var id = curKPI + "_" + i;
          //find whether the tab is generated before
          var tab = sap.ui.getCore().byId(id);
          if (tab === undefined) {
          //if tab is not exist, create one with specified id & text
            tab = new sap.m.IconTabFilter(id, {
              key: id,
              text: this.oBundle.getText(dimensions[i]),
            });
          } else {
            //if tab is exist, remove all its content
            tab.removeAllContent();
          }
          //add tab to tab bar container
          oChartContainer.addItem(tab);
        }

        // Select the first tab as default
        this.getView().byId("Column3ChartContainer1").setSelectedKey(curKPI +
          "_" + 0);
      },

      /**
       * drawDimCharts - Create dimension charts on column 3
       *
       * @returns {vizchart} - dimension chart
       */
      drawDimCharts: function () {
        //get index of selected dimension tab
        var selectedTab = this.selectedDim;
        
        //get current selected - selectedKPIChart - huawei.cmes.control.charts.KPIChart
        //this.c1 - index of selected  tile on column1
        //this.c2 - index of selected KPI chart on column2
        var selectedKPIChart = this._kpiCharts[this.c1][this.c2];

        //if current dimension chart is undefined, generate one
        if (selectedKPIChart.dimCharts[selectedTab] === undefined) {
          //huawei.cmes.control.charts.KPIChart - getSubDimChart
          //generate dimension chart
          this._dimCharts[selectedTab] = selectedKPIChart
            .getSubDimChart(selectedTab);
        } else {
        //if current dimension chart is generated, set the chart to local array this._dimCharts
        //this._dimCharts - array - save all dimension chart of current selected KPI chart
          this._dimCharts[selectedTab] = selectedKPIChart.dimCharts[
            selectedTab];
        }

        //get tab bar container of dimension charts on column3
        var dimChartContainer = this.getView()
          .byId("Column3ChartContainer1");

        // load dimenstion chart onto page
        var dimChartFrag = this
          .loadDimFragment(this._dimCharts[selectedTab]);
        //get selected dimension tab
        var displayTab = dimChartContainer.getItems()[selectedTab];
        if (displayTab !== undefined) {
          //if dimension tab is existed, remove all content
          displayTab.removeAllContent();
          //add fragment of dimension chart on tab
          displayTab.addContent(dimChartFrag);
          //set the index of selected tab as selected key of tab bar
          dimChartContainer.setSelectedKey(selectedTab);
        }
        //add try catch due to there is no selectedKPIChart.dimNames[0][0],it would occur: "Cannot read property '0' of undefined"
        try {
        sap.dimSelect=selectedKPIChart.dimNames[0][selectedTab]; 
        } catch (e) {
            console.log(e);
        }
        return this._dimCharts[selectedTab];
      },

      /**
       * drawDefectChartTabBar - create tab bar for defect charts
       * The function is called when draw defect chart tab bar
       * @return {none}
       */
      drawDefectChartTabBar: function () {
        //get container of defect tab bar
        var oChartContainer = this.getView().byId("Column3ChartContainer2");
        // clear tab bar of defect charts
        oChartContainer.removeAllItems();

        //this._defectTypes - contians two defect chart types； defect phenomenon, defect causes
        for (var i = 0; i < this._defectTypes.length; i++) {
          //set tab id and search that whether the tab is generated before
          var id = "defectTab_" + i;
          var tab = sap.ui.getCore().byId(id);
          //if the tab is not existed create one
          if (tab === undefined) {
            tab = new sap.m.IconTabFilter(id, {
              key: i,
              text: this.oBundle.getText(this._defectTypes[i])
            });
          } else {
            //if the tab is generated, clean teh content
            tab.removeAllContent();
          }
          //add tab to the container
          oChartContainer.addItem(tab);
        }
      },


      /**
       * drawDefectChart - draw the defect chart
       * The function is called when draw default defect chart or 
       * user select different dimention chart or select different defect chart type
       * @param  {String} chartType - pie, plato, bar - default 'pie'
       * @return {[type]}           [description]
       */
      drawDefectChart: function (chartType) {
        //get chart container for defect chart
        var oDefectChartsContainer = this.getView().byId(
          "Column3ChartContainer2");

        //get defect tab of current defect type 
        //this._defectIndex, the index of defect type: 0 - defect phenomenon, 1 - defect cause
        var defectTab = oDefectChartsContainer.getItems()[this._defectIndex];
        //if failed to create icon bar for defect chart, return;
        if (defectTab === undefined) {  
          return null;
        }
        //generate chartType defect chart
        var oChart = this.getDefectChart(true, chartType);

        //load onto page:
        //remove content of corresponding defect tab
        defectTab.removeAllContent();
        //add defect fragment onto UI
        defectTab.addContent(this.loadDefectFragment(oChart));

        //set current tab as selected tab
        oDefectChartsContainer.setSelectedKey(this._defectIndex);

        //set defect reload to false to avoid running some logic in function onDefectChartTypeSelect
        this._defectReload = false;
        //set current chartType as selected chart type
        //this event will invoke function onDefectChartTypeSelect
        //set this._defectReload = false to avoid running some logic in function onDefectChartTypeSelect
        sap.ui.getCore().byId(chartType).setSelected(true);

        return oChart;
      },

      /**
       * displayDefectCharts - show defect charts
       * @return {none}
       */
      displayDefectCharts: function () {
        //get the KPIs that need to show the defect chart area 
        var displayDefect = huawei.cmes.quality.setting.Config.defectKPIs;

        //get current selected KPI name
        //this._sCategory - 0: Network, 1: Terminal
        //this.c1 - selected sub-component on column1
        //this.c2 - selected KPI chart on column2
        var curKPI = this._kpiNames[this._sCategory][this.c1][this.c2];
        if (displayDefect.indexOf(curKPI) < 0) {
          //if no need show the defect charts for selected KPI 
          sap.ui.getCore().byId("__xmlview0--Column3ChartContainer2").setVisible(
            false);
        } else {
          //show defect chart for the selected KPI
          sap.ui.getCore().byId("__xmlview0--Column3ChartContainer2").setVisible(
            true);
          //set height for defect chart
          //this.selectedDim - the index of selected dimension of current KPI chart
          //this._dimCharts[this.selectedDim] - the dimension chart that is displaying on column3 for current KPI chart
          this._dimCharts[this.selectedDim].setHeight('280px');
        }
      },

      /**
       * getDefectChart - get current defect chart
       * The function is called when need to get current defect chart
       * @param  {Boolean} isNew - whether need to create
       * @param  {String}  chartType - the type of the chart, e.g pie, bar,.etc.
       * @return {vizChart} - defect chart   
       */
      getDefectChart: function (isNew, chartType) {
        if (isNew) {
          //if need to create a new defect chart
          return this._kpiCharts[this.c1][this.c2]
            .getDefectChart(this._defectIndex, chartType);
        } else {
          //if get existed defect chart
          //this._defectIndex 0 - defect phenomenon, 1 - defect cause
          //**.getContent()[0].getRows()[1].getCells()[0].getContent()[1] is the path on fragment to the chart
          return this.getView().byId("Column3ChartContainer2").getItems()[
              this._defectIndex]
            .getContent()[0].getRows()[1].getCells()[0].getContent()[1];
        }
      },


      /*******************************************************************
       * *****Utilities
       ******************************************************************/

      /**
       * isFullLoaded - check whether all charts have been loaded, if yes, enable the category switch button
       * The function is called when get model data from backend for kpi charts on column2 and dimension chart on column3
       * @return {none} 
       */
      isFullLoaded: function () {
        //get the number of charts that need to load
        //this._sCategory - 0: Network, 1: Terminal
        //this.c1 - the selected sub-component on column1
        //this._kpiNames[this._sCategory][this.c1] - array that contains the kpi names that belongs to the selected sub-component
        var kpiChartsNo = this._kpiNames[this._sCategory][this.c1]
          .length;

        // since the defualt dimension chart(the first dimension) on column3 need to be loaded with KPI charts, add 1 to kpiChartsNo 
        var allCharts = kpiChartsNo + 1;
        //this.loaded - record the number of charts have been loaded
        if (this.loaded >= allCharts) {
          //enable the switch button
          sap.ui.getCore().byId('__xmlview0--CategorydecriptionSWT').setEnabled(true);
        } else {
          //disable the switch button
          sap.ui.getCore().byId('__xmlview0--CategorydecriptionSWT').setEnabled(false);
        }

        //if all KPI charts are loaded but the dimension chart, show the dimension chart
        if (this.loaded > kpiChartsNo) {
          //show the dimension chart
          //this.selectedDim - index of selected dimension tab of current KPI
          this._dimCharts[this.selectedDim].setBusy(false);
          //set the unit of dimension chart
          this.setDimChartUnit(this._dimCharts[this.selectedDim]);
          //show the defect chart of current dimension
          this._curDefectChart.setBusy(false);
        }
      },


      /**
       * highlightOneTile - High light one tile box
       * The function is called when user select tile on column1 or set default selected tile
       * @param tileIndex - the index of selected tile
       */
      highlightOneTile: function (tileIndex) {
        //get tile boxes on column1
        var tileBoxes = this.getView().byId("tile-list").getItems();
        //if failed to create tile boxes, return
        if (tileBoxes.length === undefined || tileBoxes.length === 0) return;

        //refresh the all tiles
        for (var i = 0; i < tileBoxes.length; i++) {
          //add gray css class to all tile boxes
          tileBoxes[i].addStyleClass("tileBox-gray");
          //remove the css class used for selected tile 
          tileBoxes[i].getContent()[0].getItems()[1].getItems()[0].removeStyleClass(
            "tileBox-highlight");
        }

        //highlight selected tile:
        //remove gray css class for selected  tile
        tileBoxes[tileIndex].removeStyleClass("tileBox-gray");
        //add css class for selected tile
        tileBoxes[tileIndex].getContent()[0].getItems()[1].getItems()[0].addStyleClass(
          "tileBox-highlight");
      },


      /**
       * highlightKPIChart - highlight selected kpi char
       * The function is called when hightlight the default kpi chart on column2 or select another kpi chart
       * @param  {Integer} kpiIndex - the index of kpi chart on column 2 that need to be hightlight
       */
      highlightKPIChart: function (kpiIndex) {
        //the index of selected tile(sub-component) on column 1
        var tileIndex = this.c1;

        var kpiFrag = null;
        //this._kpiCharts[tileIndex] - all kpis charts on column2 that belongs to the selected sub-component on column1
        for (var j = 0; j < this._kpiCharts[tileIndex].length; j++) {
          //get fragment of kpi charts
          kpiFrag = this._kpiCharts[tileIndex][j].getParent().getParent()
            .getParent();
          //add css class gray to all of the charts
          kpiFrag.addStyleClass("tileBox-gray");
        }

        //get the fragment of selected chart
        kpiFrag = this._kpiCharts[tileIndex][kpiIndex].getParent().getParent()
          .getParent();
        //remove the gray css class of it
        kpiFrag.removeStyleClass("tileBox-gray");
        $('.v-clippath').remove();
      },

 
      /**
       * tileValueFormatter  - set tile value in correct format and add css class
       * The function is called when color data returned from backend
       * @param  {controller} oThat - the controller
       * @param  {Array} kpiColors - contains the color code for kpis
       * @return {none}
       */
      tileValueFormatter: function (oThat, kpiColors) {
        var that = oThat;

        //get tile list of all sub-component
        var tileList = that.getView().byId("tile-list").getItems();
        //use to save tile items(KPIs) per sub-component
        var tileItems = [];
        var className = "";
        for (var i = 0; i < tileList.length; i++) {
          //tile items(KPIs) of sub-componnet i 
          tileItems = tileList[i].getContent()[0].getItems()[1]
            .getItems()[1].getItems();
          for (var j = 0; j < tileItems.length; j++) {
            if (tileItems[j] !== undefined) {
              //get the kpi name of current tile item
              var kpiName = tileItems[j].getContent()[0].getProperty("text")
                .split(":")[0];
              //get the color code of current kpi
              var colorCode = parseInt(kpiColors[kpiName]);
              //set the corresponding class name
              switch (colorCode) {
              case 0:
              //css class to set red color
                className = "tile-kpi-value-red";
                break;
              case 1:
              //css class to set yellow 
                className = "tile-kpi-value-yellow";
                break;
              case 2:
              //css class to set green
                className = "tile-kpi-value-green";
                break;
              }
              //set css class to the kpi text
              tileItems[j].getContent()[1].addStyleClass(className);
            }
          }
        }
      },


      /*******************************************************************
       * *****Load to page
       ******************************************************************/
     
      /**
       * loadDefectFragment - Load fragment for defect chart
       * The function is called when draw defect chart
       * @param  {vizchart} oChart - defect chart
       * @return {fragment}  - the fragment of defect chart
       */
      loadDefectFragment: function (oChart) {
        //load fragment for defect chart
        var oFragment = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.SubDefectChart", this);
        //load deect chart onto fragment
        oFragment.getRows()[1].getCells()[0].addContent(oChart);

        //set chart title on fragment
        oFragment.getRows()[0].getCells()[0].getContent()[0].setText(oChart.getTitle()
          .getText());

        return oFragment;
      },

      /**
       * loadDiffTypeChart - replace current defect chart by the selected type of char
       * The function is called when user select different defect chart type
       * @param  {String} chartType - the type of defect chart: pie, dual, bar
       */
      loadDiffTypeChart: function (chartType) {
        //get current KPIChart - huawei.cmes.control.charts.KPIChart
        //this.c1 - the index of selected tile on column1
        //this.c2 - the index of selected kpi chart on column2
        var kpiChart = this._kpiCharts[this.c1][this.c2];
        var orgData = this.deepClone(kpiChart.dimModels[this.selectedDim]);

        //get a new defect chart form kpi chart 
        this._curDefectChart = this.getDefectChart(true, chartType);
        //set original model data for current defect chart
        this.setDefectModel(this._curDefectChart, orgData);

        //if the selected type of defect chart is existed, replaced by new defect chart
        if (this.getDefectChart(false, '') !== undefined) {
          //Get the position of current defect chart
          var chartLoc = this.getDefectChart(false, '').getParent();
          chartLoc.removeContent(1);
          //replace the original defect chart with the new one
          chartLoc.addContent(this._curDefectChart);
        }
      },

      /**
       * loadSub1Fragment - load kpi chart control into the fragment for charts on column
       * The function is called when load KPI chart onto carousel on column2
       * @param  {huawei.cmes.control.charts.KPIChart} oChart - the kpi chart control
       */
      loadSub1Fragment: function (oChart) {
        //load the fragment for kpi chart
        var oFragment = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.Sub1Chart", this);
        //initialize unit and title
        var unit = '',title = '';
        if (oChart.getUnit() !== undefined) {
          //set unit in proper format
          unit = this.oBundle.getText("UNIT") + ": " + oChart.getUnit();
          //set unit on fragment of kpi chart
          oFragment.getRows()[1].getCells()[0].getContent()[0].setText(unit);
        }
        //get title of the KPI chart
        title = oChart.TITLE;
        //set title onto fragment
        oFragment.getRows()[0].getCells()[0].getContent()[0].setText(title);
        //set chart onto fragment
        oFragment.getRows()[1].getCells()[0].addContent(oChart);

        return oFragment;
      },

      /**
       * loadColumn2Carousel - load all fragments of kpi charts on column2 into carousel
       * The function is called when draw kpi charts on column2
       */
      loadColumn2Carousel: function () {
        //get vbox for all kpi charts
        var oChartContainer = this.getView().byId("Column2ChartVBox");

        //this.c1 - the index of selected tile(sub-component) on column1
        //if no kpi chart is existed, return
        if (this._kpiCharts[this.c1] === undefined) return;
        //get the total number of kpi charts
        var _iChartcount = this._kpiCharts[this.c1].length;
        var frag = null;
        var chart = null;

        //get the minimum number of charts on one page
        var minSize = this.sPagesize;
        //set content height
        var contentHight = document.body.scrollHeight - 60;
        //calculate the number of charts that can display on one page on column2
        var size = Math.floor((contentHight - 50) / 270);
        size = size >= minSize ? size : minSize;
        var crsHight = 80 + size * 270 + "px";

        var oPanel = null;
        var i = 0;

        //if all kpi charts can be displayed on one page
        if (_iChartcount <= size) {
          oPanel = new sap.ui.commons.Panel({
            width: "100%"
          });
          //total number of kpi charts
          var chartNo = this._kpiCharts[this.c1].length;

          //loop to load fragment to panel
          for (i = 0; i < chartNo; i++) {
            //chart - huawei.cmes.control.charts.KPIChart
            //this._kpiCharts - save all KPI charts
            //this._kpiCharts[this.c1] - all KPI charts belongs to selected sub-component(this.c1)
            chart = this._kpiCharts[this.c1][i];
            //load chart and title to fragment
            frag = this.loadSub1Fragment(chart);
            //add fragment to panel
            oPanel.addContent(frag);
          }
          //remove all existed items on column2
          oChartContainer.removeAllItems();
          //add panel to Column2ChartVBox on column2
          oChartContainer.addItem(oPanel);
          //add css class to Column2ChartVBox
          oChartContainer.addStyleClass("sub1chart-box_panel");

        } else {
          //if one panel is not enough
          //create carousel for all pages
          var oCarousel = new sap.ui.commons.Carousel({
            width: "100%",
            //            height: crsHight
          }).addStyleClass('kpi-chart-carousel');
          //remove css class for Column2ChartVBox if added before
          oChartContainer.removeStyleClass("sub1chart-box_panel");
          oCarousel.setOrientation("vertical");
          oCarousel.setVisibleItems(1);

          //array to save panels
          var _oPanels = {};
          //calculate how many pages are need
          var _iPagecount = Math.ceil(_iChartcount / size);

          //loop to load fragment on each page
          for (var j = 0; j < _iPagecount; j++) {
            oPanel = new sap.ui.commons.Panel({
              // height:crsHight 
            });
            //n - the number of charts loaded on page
            var n = j * size;
            for (i = 0; i < size; i++) {
              //if all charts have been loaded, break;
              if (n + i >= this._kpiCharts[this.c1].length) {
                break;
              }
              //if there is more charts need to be loaded, get the kpi chart
              chart = this._kpiCharts[this.c1][n + i];
              //load the chart on fragment
              frag = this.loadSub1Fragment(chart);
              //add fragment onto panel(page)
              oPanel.addContent(frag);
              //add current page to array of pages
              _oPanels[j] = oPanel;
            }
            //add all pages to carousel
            oCarousel.addContent(_oPanels[j]);
            //remove all existed items on Column2ChartVBox
            oChartContainer.removeAllItems();
            //add carousel on Column2ChartVBox
            oChartContainer.addItem(oCarousel);
          }
        }
        $('.v-clippath').remove();
        //hightlight selected/default KPI chart on column2
        this.highlightKPIChart(this.c2);
      },

      /**
       * loadDimFragment load defect chart control to the fragments for defect chart
       * The function is called when draw dimension chart
       * @param  {huawei.cmes.control.charts.KPIChart} oChart [the defect chart control]
       */
      loadDimFragment: function (oChart) {
        //load fragment for dimension chart
        var oFragment = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.Sub2Chart", this);
        oFragment.getItems()[1].addItem(oChart);
        return oFragment;
      },


      /**
       * loadChartPopover - Load charts onto popover dialog
       * @param  {String} oTitle - the title of KPI chart
       * @param  {vizchart} oChart - the KPI chart
       * @return {none}
       */
      loadChartPopover: function (oTitle, oChart) {
        //this._chartDlg is the dialog of KPI chart
        this._chartDlg.removeAllContent();
        //empty the title
        sap.ui.getCore().byId('chart-dlg-title').setText('');
        //add css class on KPI chart
        oChart.addStyleClass('popover-chart');
        //add KPI chart on dialog
        this._chartDlg.addContent(oChart);
        //set title onto dialog
        sap.ui.getCore().byId('chart-dlg-title').setText(oTitle);
        //open the dialog
        this._chartDlg.open();
        $('.v-clippath').remove();
      },



      /*******************************************************************
       * *****Event Handling
       ******************************************************************/

      /**
       * handleCategoryPress - handle the switch event of global category
       * The function is called when user switch category button
       *
       * @param {event} oEvent - ui5 press event on switch button
       */
      handleCategoryPress: function (oEvent) {
        this.loaded = 0;
        //since category is changed, clear the data filter
        if (this._oFilterDlg !== undefined) {
          this._oFilterDlg._oFilter.setCurKPI('');
        }
        this._sqlFilter = "";
        this.adjustTileIconShown();

        //when user switched the category, the switch button is disabled to avoid user quick switch back
        sap.ui.getCore().byId('__xmlview0--CategorydecriptionSWT').setEnabled(
          false);
        if (!oEvent.getParameter("state")){
            this._sCategory = 0;//network
            sap.category = this._sCategory;
        }
        else{
        	this._sCategory = 1; //terminal
            sap.category = this._sCategory;
        }
        if (this._kpiNames[this._sCategory] === undefined) {
          //if kpi names have not loaded for current category, (re)initalize the page
          this.initPage();
        } else {
          //generate tiles and draw kpi charts
          this.drawPage();
        }
      },

      /**
       * onTileSelect - handle the press event of tile boxes on column1
       *
       * @param {event} oEvent - ui5 select event on tiles on column1
       */
      onTileSelect: function (oEvent) {
        //Find ALl Charts and Reset the legend select History
        $('.sapVizChart').each(function (index, item) {
          var chartId = item.id;
          //Set the select history to undefined
          if (sap.chartSelect !== undefined) {
            sap.chartSelect[chartId] = undefined;
          }
        });

        //get selected item
        var selectedItem = oEvent.getParameter("listItem");
        //get list of tiles on column1
        var tileList = this.getView().byId("tile-list");
        //get the index of selected tile(sub-component) on column1
        var index = tileList.indexOfItem(selectedItem);

        //hightlight selected tile
        this.highlightOneTile(index);

        //set the index of selected tile
        this.c1 = index;
        //set default index of dimension chart on column2
        this.c2 = 0;
        //empty the data filter text
        this._sqlFilter = '';
        //draw kpi and dimension charts on column2,3
        this.drawCharts();
        $('.v-clippath').remove();
      },

      /**
       * onKPISelect - handle the click event on KPI chart (Column 2 Charts)
       *
       * @param {event} oEvent - ui5 select event on KPI charts
       */
      onKPISelect: function (oEvent) {
        // console.log("onKPISelect");
        // if the data filter sql text is not empty, clear all model data for dimension chart
        if (this._sqlFilter !== '') {
          //clear model data of dimension charts
          this.clearDimData();
        }

        //empty data filter sql text
        this._sqlFilter = "";
        //get selected KPI chart
        var kpiChart = sap.ui.getCore().byId(oEvent.currentTarget.id);
        //get the selected KPI name
        var sKPI = kpiChart.getParent().KPI;
        sap.kpiSelected = sKPI;
        var index = 0,
        //get all kpi names belong to current selected category and sub-component
          kpiNames =
          this._kpiNames[this._sCategory][this.c1];
        //loop to get the index of selected KPI chart 
        for (var i = 0; i < kpiNames.length; i++) {
          if (kpiNames[i] === sKPI) {
            index = i;
            break;
          }
        }

        /*if (index === this.c2) {
          return;
        }*/

        //set index of selected KPI chart
        this.c2 = index;
        //draw KPI chart on column2
        this.drawColumn3Charts();
        //hightlight selected KPI chart on column2
        this.highlightKPIChart(this.c2);
      },

      //Popover handlers
      /**
       * onKPIChartPopover - handle the click event on popover button of KPI chart (Column 2 Charts)
       *
       * @param {event} oEvent - ui5 click event on KPI chart
       */
      onKPIChartPopover: function (oEvent) {
        //get KPI chart that user click popover
        var selectedChart = oEvent.oSource.getParent().getParent().getParent()
          .getRows()[1].getCells()[0].getContent()[1];

        //get current selected(highlight) kpi chart
        var kpiCharts = this._kpiCharts[this.c1];
        //popUpChart is used to save the chart that displays on the popover
        var popUpChart = null;
        //loop to see whether the popover is on the selected KPI chart
        for (var i = 0; i < kpiCharts.length; i++) {
          if (kpiCharts[i].KPI === selectedChart.KPI) {
            //clone the kpi chart to popupchart
            popUpChart = kpiCharts[i].clone();
            break;
          }
        }
        if (popUpChart === null) {
          return;
        }
        /*var kpiChart = this._kpiCharts[this.c1][this.c2].clone();*/
        //adjust yaxis of popover chart
        CHART_HELPER.adjustChartYAxis(popUpChart.getKPIChart());

        //add css class to popover chart
        popUpChart.getKPIChart().addStyleClass('popover-chart');
        //load popover chart
        this.loadChartPopover(popUpChart.TITLE, popUpChart);
      },

      /**
       * onDimChartPopover - handle the click event on popover button of Dimension chart
       * (charts on the top of column 3)
       *
       * @param {event} oEvent - ui5 click event on popover icon on dimension chart
       */
      onDimChartPopover: function (oEvent) {
        //set popover title of selected dimension chart
        var sTitle = this._kpiCharts[this.c1][this.c2].KPI;
        //get the dimension name of selected dimension chart
        //this.c1 - the index of selected tile(sub-component) on column1
        //this.c2 - the index of kpi chart on column2
        //this._sCategory - 0: network, 1: terminal
        //this.selectedDim - the index of selected dimension of current kpi chart
        var dName = this._kpiCharts[this.c1][this.c2]
          .dimNames[this._sCategory][this.selectedDim];

        //get selected dimension chart
        var kpiChart = this._kpiCharts[this.c1][this.c2].getSubDimChart(this.selectedDim);

        //set model for dimension chart
        var oModel = this._dimCharts[this.selectedDim].getModel();
        kpiChart.setModel(oModel);

        //adjust the yaxis of selected dimension chart
        CHART_HELPER.adjustChartYAxis(kpiChart);
        //        CHART_HELPER.adjustChartPeriod(this._globalPeriod, this._globalStartDate,
        //          this._globalEndDate, kpiChart, "DIMENSION");

        //set popover title of selected dimension chart
        sTitle = this.oBundle.getText(sTitle) + " by " + this.oBundle.getText(
          dName);
        //load dimension chart and title onto fragment 
        this.loadChartPopover(sTitle, kpiChart);
      },

      /**
       * onDefectChartPopover - handle the click event on popover button of Defect chart
       * (charts on the bottom of column 3)
       *
       * @param {event} oEvent - the ui5 click event on defect chart popover
       */
      onDefectChartPopover: function (oEvent) {
        //copy the defect chart
        var dChart = this._curDefectChart.clone();
        //set popover title
        var sTitle = this._defectTypes[this._defectIndex];
        sTitle = this.oBundle.getText(sTitle);
        //load defect chart and title onto fragment of popover
        this.loadChartPopover(sTitle, dChart);
      },

      /**
       * onDimensionTabSelect - load dimension and defect chart on column3
       * The function is called when user select different dimension tab
       * 
       * @param  {event} oEvent - ui5 click event to select different dimension tab
       */
      onDimensionTabSelect: function (oEvent) {
        //Reset All Select History of all points on dimension chart
        $('.quality-dimension-chart').each(function (index, item) {
          var chartId = item.id;
          //This will trigger another funcion {onDeSelectRerender} in util/chart/Helper
          if (sap.chartSelect !== undefined) {
            sap.chartSelect[chartId] = undefined;
          }
        });

        //Set BO dimension name
        sap.boDimension = oEvent.getParameters().item.getText();
        //get Container for defect charts
        var oDefectChartsContainer = this.getView().byId(
          "Column3ChartContainer2");
        var defectTab = null;
        //this._defectTypes - save defect type names
        //0 - defect phenomenon
        //1 - defect causes
        //loop all defect tab, remove all existed content
        for (var i = 0; i < this._defectTypes.length; i++) {
          defectTab = oDefectChartsContainer.getItems()[i];
          defectTab.removeAllContent();
        }
        //get the index of selected dimension chart
        this.selectedDim = parseInt(
          oEvent.getParameter("selectedKey").split("_")[1]);
        //set the index of selected defect chart to default type - 0 - "defect phenomenon"
        this._defectIndex = 0;
        //create new defect chart and bind data for newly selected dimension
        this._curDefectChart = this.drawDefectChart("pie");

        //sap.ui.getCore().byId("pie").setSelected(true) will invoke function onDefectChartTypeSelect
        //set this._defectReload = false to avoid running some logic in function onDefectChartTypeSelect
        this._defectReload = false;
        sap.ui.getCore().byId("pie").setSelected(true);

        //set model data for dimension charts on column3
        this.setColumn3ChartModel(this.drawDimCharts());

      },


      //Dimension DDL handlers
      /**
       * onDimensionDDLOpen - handle the click event on dimension drop-down list on top of column 3
       * The function is called when user open dimension drop-down list
       * @param {event} oEvent - ui5 click event to open drop-down list
       */
      onDimensionDDLOpen: function (oEvent) {
        //get selected KPI chart - huawei.cmes.control.charts.KPIChart
        //this.c1 - index of selected tile(sub-component) on column1
        //this.c2 - index of selected KPI chart on column2
        var selectedKPIChart = this._kpiCharts[this.c1][this.c2];
        //get dimension name of selected dimension chart
        var curDim = selectedKPIChart.dimNames[this._sCategory][this.selectedDim];

        //copy orignal model data of selected dimension chart
        var orgValues = this.deepClone(this._dimOrgValues[this.selectedDim]);

        var dimModel = new sap.ui.model.json.JSONModel();
        //if current dimension is included in the data filter fields
        var dimIndex = this._sqlFilter.indexOf(curDim);
        if (dimIndex > -1) {
          var tmpFilter = this._sqlFilter.substr(dimIndex);
          var endIndex = tmpFilter.indexOf("%29");
          // dataFilter - all selected dimension values in the data filter
          var dataFilter = tmpFilter.substr(dimIndex, endIndex);
          var finalList = [];
          // only the selected dimension values by data filter could be displayed on the drop-down list
          for (var l = 0; l < orgValues.length; l++) {
            var encodeDim = jQuery.sap.encodeURL(orgValues[l].DIMENSION);
            if (dataFilter.indexOf(encodeDim) > -1) {
              finalList.push({
                DIMENSION: orgValues[l].DIMENSION
              });

            }
          }
          //set filtered data as model data
          dimModel.setData(finalList);
        } else {
          //if current dimension is not included in data filter field
          //set original data as drop-down list model data
          dimModel.setData(orgValues);
        }

        //set model data for dimension drop-down list
        this._dimensionDDL.setModel(dimModel);
        //if selection is empty or are same with dimension values, means all values are selected
        if (this._selectedDims[this.selectedDim].length === 0 ||
          this._selectedDims[this.selectedDim].length === orgValues.length) {
          sap.ui.getCore().byId("ddl-selectAll").setSelected(true);
        } else {
          //else, filter in the selected values get from data filter 
          this._initLoad = true;
          sap.ui.getCore().byId("ddl-selectAll").setSelected(false);
          var ddlItems = sap.ui.getCore().byId("DimensionValueList").getItems();
          //ddlItems - all items of drop-down list
          for (var j = 0; j < ddlItems.length; j++) {
            //this._selectedDims[this.selectedDim] - selected values of current selected dimension
            for (var i = 0; i < this._selectedDims[this.selectedDim].length; i++)
              if (this._selectedDims[this.selectedDim][i] === ddlItems[j].getProperty(
                "title")) {
                ddlItems[j].setSelected(true);
              }
          }
        }

        //open the drop-down list
        this._dimensionDDL.openBy(oEvent.getSource());
      },

      /**
       * onDimensionValueSelect - handle the click event on 'OK' button of dimension drop-down list
       * The function is called when user select dimension of drop-down list
       * @param {event} oEvent - ui5 select event on dimension drop-down list
       */
      onDimensionValueSelect: function (oEvent) {
        //close drop-down list
        this._dimensionDDL.close();

        //if the button user clicked is not 'OK' button, do nothing
        if (oEvent.getParameter('id') !== 'ddlOK') {
          return;
        }
        //current kpi chart
        var kpiChart = this._kpiCharts[this.c1][this.c2];
        //original model data of current dimension chart
        //this.selectedDim - index of selected dimension tab of current KPI
        var orgData = this.deepClone(kpiChart.dimModels[this.selectedDim]);

        //get the drop-down list
        var dimensionDDL = sap.ui.getCore().byId("DimensionValueList");

        //this._selectedDims[index of each dimension] - Array - save selected dimensions of each dimension chart
        this._selectedDims[this.selectedDim] = [];
        //get selected dimensions on drop-down list
        var selectedItems = dimensionDDL.getSelectedItems();

        //loop to add all selected dimensions to array this._selectedDims[this.selectedDim]
        for (var i = 0; i < selectedItems.length; i++) {
          this._selectedDims[this.selectedDim].push(selectedItems[i]
            .getProperty("title"));
        }
        //generte and bind data to dimension chart control based on this._selectedDims
        this.setColumn3ChartModel(this._dimCharts[this.selectedDim]);
        //update the model data of defect chart without creating a new chart
        var curDefectChart = this.getDefectChart(false, '');
        //set model data of defect chart
        this.setDefectModel(curDefectChart, orgData);
      },


      /**
       * onDimDDLSelectAll - handle the select All event on dimension drop-down list
       * The function is called when user check 'select all' on dimension drop-down list
       * @param {event} oEvent - ui5 select event - check 'select all ' checkbox on drop-down list
       */
      onDimDDLSelectAll: function (oEvent) {
        //this._initLoad - use to mark whether need to reload data for dimension drop-down list
        if (this._initLoad) {
          this._initLoad = false;
          return;
        }
        //get dimension drop-down list 
        var ddl = sap.ui.getCore().byId("DimensionValueList");
        //get whether user checked 'select all'
        var selected = sap.ui.getCore().byId("ddl-selectAll").getSelected();
        if (selected) {
          ddl.selectAll();
        } else {
          //if user doesn't check 'select all', all items are unchecked
          var items = ddl.getItems();
          for (var i = 0; i < items.length; i++) {
            items[i].setSelected(selected);
          }
        }

      },

      /**
       * onDimDDLSelectChange - handle the select event on dimension drop-down list
       * The function is called when user select dimension on drop-down list
       * @param {event} oEvent - ui5 select event on dimension drop-down list
       */
      onDimDDLSelectChange: function (oEvent) {
        //dynamically control the check status of item 'select all' on the dimension ddl
        var selected = oEvent.getParameter("selected");
        var selectAll = sap.ui.getCore().byId("ddl-selectAll");
        
        //once user select one dimension, 'select all' will be unchecked automatically
        //if user check one dimension on drop-down list
        //uncheck 'select all' automatically
        if (!selected) {
          selectAll.setSelected(false);
        } else {
          //if user uncheck one dimension on drop-down list
          var ddl = sap.ui.getCore().byId("DimensionValueList");
          var items = ddl.getItems();
          for (var i = 0; i < items.length; i++) {
            //if there is one dimension on drop-down list
            //uncheck 'select all' 
            if (!items[i].getSelected()) {
              selectAll.setSelected(false);
              return;
            }
          }
          //if no dimension selected, check 'select all' automatically
          selectAll.setSelected(true);
        }

      },

      /**
       * onDefectChartTypeSelect - handle the select event on chart category ddl
       * The function is called when user select differnt defect chart type
       * @param {event} oEvent - ui5 select event on chart type
       */
      onDefectChartTypeSelect: function (oEvent) {
        //if this._defectReload is false, no need to reload defect chart
        if (!this._defectReload) {
          this._defectReload = true;
          return;
        }
        //close the defect type select popover
        this._defectChartTypePopover.close();
        //get chart type, e.g. "pie","bar", etc.
        var chartType = oEvent.getParameter("id");
        //set the selected defect type to this._defectTyp as record
        this._defectType = chartType;
        //replace current defect chart by selected defect chart
        this.loadDiffTypeChart(chartType);
      },


      /**
       * onDefectTabSelect - handle click event when select different defect tab
       * The function is called when user select different defect tab
       * @param  {event} oEvent - the ui5 click event
       * @return {none}
       */
      onDefectTabSelect: function (oEvent) {
        //get current kpi chart
        //kpiChart - type: huawei.cmes.control.charts.KPIChart
        var kpiChart = this._kpiCharts[this.c1][this.c2];
        //get original data of selected dimension chart
        //this.selectedDim - the index of selected dimension tab
        //kpiChart.dimModels - save all loaded model data of dimension charts
        var orgData = this.deepClone(kpiChart.dimModels[this.selectedDim]);

        //get the index of selected defect type:
        //this._defectIndex: 0 - defect phenomenon, 1 - defect cause
        this._defectIndex = oEvent.getParameter("key");

        var chartType = "";
        //this.getView().byId("Column3ChartContainer2").getItems() - get defect tabs
        //**.getItems()[this._defectIndex] - get selected defect tab
        //**.getItems()[this._defectIndex].getContent()[0] - the position for defect chart fragment
        if (this.getView().byId("Column3ChartContainer2").getItems()[this._defectIndex]
          .getContent()[0] === undefined) {
          //if no defect chart loaded, create pie chart as default
          this._defectType = "pie"; 
          //get current defect chart
          this._curDefectChart = this.drawDefectChart(this._defectType);
          //set model data for current defect chart
          this.setDefectModel(this._curDefectChart, orgData);

          //if set true, the event handler on defect chart type select will be trigger incorrectly
          this._defectReload = false; 
          chartType = this.getDefectType(this._curDefectChart);
          sap.ui.getCore().byId(chartType).setSelected(true);
        } else { 
          //if the defect chart is existed, re-bind data and get the chart type
          this._curDefectChart = this.getDefectChart(false, '');
          //the search criteria may be changed, need to re-bind the data
          this.setDefectModel(this._curDefectChart, orgData); 

          //this._defectType - the index of defect type: 0 - network, 1 - terminal;
          this._defectType = this._curDefectChart.getVIZChartType().split("/")[
            1]; 

          //chartType - the type of defect chart - string: pie, bar, etc.
          chartType = this.getDefectType(this._curDefectChart);
          //this event will invoke function onDefectChartTypeSelect
          //set this._defectReload = false to avoid running some logic in function onDefectChartTypeSelect
          this._defectReload = false;
          sap.ui.getCore().byId(chartType).setSelected(true);
        }

      },


      //Data Filter Handlers 
      /**
       * handleFilterPopover - handle the click event on data filter button on top of column 3
       * The function is called when user open data filter popvoer
       * @param {event} oEvent - ui5 click event on data filter button
       */
      handleFilterPopover: function (oEvent) {
        var that = this;
        //if the filter dialog is not existed
        if (this._oFilterDlg === undefined) {
          var userId;
          jQuery.ajax({
            url: "userinfojsonns/GetUserInfoAction.action",
            context: this,
            success: function (data) {
              userId = data.session.wId;
            },
            async: false
          });

          //generate fragment for data filter dialog
          this._oFilterDlg = sap.ui.xmlfragment(
            "huawei.cmes.fragment.quality.BuildChartFilter", this);
          this.getView().addDependent(this._oFilterDlg);
        }

        //
        var filterArea = sap.ui.getCore().byId("filterBar");
        //get current kpi name to fetch the dimensions
        var kpi = this._kpiNames[this._sCategory][this.c1][this.c2];
        kpi = jQuery.sap.encodeURL(kpi);
        //if the filter has not been used or the selected kpi is changed, create a new filter
        if ((this._oFilterDlg._oFilter === undefined) || (kpi !== this._oFilterDlg
          ._oFilter.getCurKPI())) {
          //initial data filter with default setting
          var advFilter = new huawei.cmes.control.Filter.MESFilter({
            dateFrom: this._globalStartDate, //set start date of query
            dateTo: this._globalEndDate, //set end date of query
            productCategory: this._sCategory, //set current category
            curKPI: kpi, //set current KPI
            width: "100%",
            defaultSpan: "L12 M12 S12",
            vSpacing: 0,
            hSpacing: 0
          });

          //set filter model data
          var filterModel = new sap.ui.model.json.JSONModel(
            huawei.cmes.util.services.Proxy.XsjsProxy(this._filterDims,
              "?KPI=" +
              kpi + "&KType=" + this._sCategory));

          advFilter.setModel(filterModel);
          //reload the content of data filter dialog
          filterArea.removeAllContent();
          filterArea.addContent(advFilter);
          //set new filter to data filter dialog
          this._oFilterDlg._oFilter = advFilter;

          filterModel
            .attachRequestCompleted(
              //callback function
              function () {
                that._oFilterDlg._oFilter.initRanges();
              });
        }

        this._oFilterDlg.open();
      },

      /**
       * onFilterDlgClose - handle the click event on 'OK' and 'Cancel' button of Data filter dialog
       * @param {event} oEvent - ui5 event that close the filter dialog
       */
      onFilterDlgClose: function (oEvent) {
        //close the filter dialog
        this._oFilterDlg.close();
        //if click 'Cancel' button
        if (oEvent.getParameter('id') === 'filter-cancel') {
          return;
        }

        //get the query sql text from data filter
        var tmpFilter = this._oFilterDlg._oFilter
          .getFormatedRangeSQLText();
        // console.log(tmpFilter);
        // if the newly get query sql text is different with current sql text
        // set current sql text as this._sqlFilter
        if (tmpFilter.localeCompare(this._sqlFilter) !== 0) {
          this._sqlFilter = tmpFilter;
          //Get the url that BO needs
          sap.boUrl = sap.dimensionFilterCombination
            .replace(/\(|\)|\'/g, '')
            .replace(/\,/g, ';')
            .replace(/ IN /g, '=')
            .replace(/AND /g, '&lsM')
            .replace(/ /g, '');

          //empty all saved all dimension model data
          this.clearDimData();
          this.setColumn3ChartModel(this.drawDimCharts());
        }

      },

      /**
       * clearDimData - clear all loaded dimension model data
       * This function is called when data/time filter is changed or another KPI is selected
       * @return {none}
       */
      clearDimData: function () {
        var kpiChart = this._kpiCharts[this.c1][this.c2];
        kpiChart.dimModels = [];
      },

      /**
       * handle the click event on 'Reset' button of Data filter dialog
       * @param oEvent
       */
      onFilterReset: function () {
        this._oFilterDlg._oFilter.reset();
      },

      //Time Filter Handlers
      ontfCancel: function () {
        var oNavCon = sap.ui.core.Fragment.byId("popoverNav",
          "nav");
        oNavCon.back();
      },

      /**
       * handle the click event on 'Time Selection'
       * @param oEvent
       */
      onTimeFilterOpen: function (oEvent) {
        var that = this;
        /**
         * call this function when calendar button is clicked
         * @param  {String} view id in fragment - 2 calendars in it
         * @param  {String} first calendar sap id
         * @param  {String} second calendar sap id
         * @return {Function} return the functin when the button is click
         */
        var listenerFunc = function (id, calendar1, calendar2) {
          /**
           * Call this function to change the date selection range in canlendar
           * @param  {sap.ui.unified.Calendar} oCalendar
           * @param  {Int} month change - back 2 month---2 | forward 2 month--2
           */
          var dateChange = function (oCalendar, month) {
            var year = 0;
            var focusDate = oCalendar._getFocusedDate(); // the focused range of the calendar
            var tempMonth = new Date(focusDate).getMonth();
            var tempYear = 1900 + new Date(focusDate).getYear();
            var changedDate = new Date();
            if (month > 0) {
              if (tempMonth === 11) {
                month = -11;
                year = 1;
              }
            } else {
              if (tempMonth === 0) {
                month = 11;
                year = -1;
              }
            }
            //get the target month
            changedDate.setFullYear(tempYear + year, tempMonth + month,
              15);

            var backDate = new Date(changedDate);
            //Set the focused date range of the calendar
            oCalendar.focusDate(backDate);
          };
          //Back 1 month
          var dateBack = function (oCalendar) {
            dateChange(oCalendar, -1);
          };
          //Forward 1 month
          var dateForward = function (oCalendar) {
            dateChange(oCalendar, 1);
          };

          return function () {
            //Get the fragment view 1
            var oNavCon = sap.ui.core.Fragment.byId("popoverNav",
              "nav");
            //get the fragment view 2
            var oDetailPage = sap.ui.core.Fragment.byId("popoverNav",
              id);
            //Jump from fragment 1 to fragment view 2 the fragment view is is 'id'
            oNavCon.to(oDetailPage);

            var currentMonthDate, lastMonthDate;
            if (id.indexOf('start') > -1) {
              currentMonthDate = new Date(that._globalStartDate);
              lastMonthDate = new Date(that._globalStartDate);
            } else {
              currentMonthDate = new Date(that._globalEndDate);
              lastMonthDate = new Date(that._globalEndDate);
            }
            HELPER.getLastMonth(lastMonthDate);

            var oCalendar1 = sap.ui.getCore().byId(
              "popoverNav--" + calendar1);
            var oCalendar2 = sap.ui.getCore().byId(
              "popoverNav--" + calendar2);

            oCalendar1.focusDate(lastMonthDate); // set the date range of 1st calendar
            oCalendar2.focusDate(currentMonthDate); // set the date range of 2nd calendar
            //Cancel all click event of the back button
            $("#popoverNav--" + calendar1 + "-prev").off("click");
            //Create a new click even listener of the back button
            $("#popoverNav--" + calendar1 + "-prev").click(function () {
              dateBack(oCalendar2);
            });

            //Cancel all click event of the forward button
            $("#popoverNav--" + calendar2 + "-next").off("click");
            //Create a new click even listener of the forward button
            $("#popoverNav--" + calendar2 + "-next").click(function () {
              dateForward(oCalendar1);
            });

            // remove the forward button of the first calendar
            // remove the back button of the second calendar
            // because the 2 calendars are sharing 1 back button and 1 forward button
            $("#popoverNav--" + calendar1 + "-next").remove();
            $("#popoverNav--" + calendar2 + "-prev").remove();

          };
        };

        /**
         * Start set the listeners of the double calendar control
         */
        var listenerSetting = function () {
          //Call this function when the first datepicker control is clicked
          var startFunc = listenerFunc('detail-start', 'calendar1',
            'calendar2');
          //Call this function when the end datepicker control is clicked
          var endFunc = listenerFunc('detail-end', 'calendar3', 'calendar4');
          //Attach the event
          sap.ui.getCore().byId("popoverNav--tfStart").attachBrowserEvent(
            'click', startFunc);
          //Attach the event
          sap.ui.getCore().byId("popoverNav--tfEnd").attachBrowserEvent(
            'click', endFunc);
        };

        var timeFilter = sap.ui.getCore().byId('popoverNav--timeFilter');
        if (timeFilter !== undefined) {
          this.getView().removeDependent(timeFilter);
          timeFilter.destroy();
        }
        //load fragment for time filter
        timeFilter = sap.ui.xmlfragment('popoverNav',
          "huawei.cmes.fragment.quality.GlobalTimeFilter", this);
        this.getView().addDependent(timeFilter);
        //set value for start date on UI
        sap.ui.getCore().byId("popoverNav--tfStart").setValue(HELPER.getDisplayDate(
          this._globalPeriod, this._globalStartDate));
        //set value for end date on UI
        sap.ui.getCore().byId("popoverNav--tfEnd").setValue(HELPER.getDisplayDate(
          this._globalPeriod, this._globalEndDate));
        //set selected period on UI
        sap.ui.getCore().byId("popoverNav--" + this._globalPeriod).setSelected(
          true);

        listenerSetting();

        var oButton = oEvent.getSource();

        jQuery.sap.delayedCall(0, this, function () {
          timeFilter.openBy(oButton);
        });

      },

      /**
       * handleCalendarSelect - handle event when user select data on global time filter
       * @param  {event} oEvent - ui5 click event on calendar
       * @return {none}
       */
      handleCalendarSelect: function (oEvent) {
        var oCalendar = oEvent.oSource;
        
        var date = oCalendar.getSelectedDates()[0].getStartDate();
        date = sap.ui.core.format.DateFormat.getInstance({
          pattern: "yyyy-MM-dd"
        }).format(date);

        var period = (this._tmpPeriod !== null) ? this._tmpPeriod : this._globalPeriod;

        var dispDate = '',
          msg = '';
        var calendarId = oEvent.getParameter('id');
        if (calendarId.indexOf('calendar1') < 0 && calendarId.indexOf('calendar2') < 0) {
          //get temporary end date 
          this._tmpEndDate = HELPER.getSearchDate(period, date, false);
          //get proper date format for show on UI
          dispDate = HELPER.getDisplayDate(period, this._tmpEndDate);
          //set end date on UI
          sap.ui.getCore().byId('popoverNav--tfEnd').setValue(dispDate);
          //get start date
          var startDate = this._tmpStartDate === null ? this._globalStartDate : this._tmpStartDate;
          //validate the combination
          msg = HELPER.periodValidation(startDate, this._tmpEndDate, period);
          sap.startDate = startDate;
        } else {
          //set temporary start date
          this._tmpStartDate = HELPER.getSearchDate(period, date, true);
          //get proper date format for show on UI
          dispDate = HELPER.getDisplayDate(period, this._tmpStartDate);
          //set start date value on UI
          sap.ui.getCore().byId('popoverNav--tfStart').setValue(dispDate);
          var endDate = this._tmpEndDate === null ? this._globalEndDate : this._tmpEndDate;
          //validate the combination
          msg = HELPER.periodValidation(this._tmpStartDate, endDate, period);
        }
        
        //if msg !== '', the validation is failed
        //the msg is the error message
        if (msg !== '') {
          sap.ui.getCore().byId('popoverNav--tf-okBtn').setEnabled(false);
          sap.ui.getCore().byId('popoverNav--tf-warnmsg').setText("* " + this.oBundle.getText(msg));
        } else {
          sap.ui.getCore().byId('popoverNav--tf-okBtn').setEnabled(true);
          sap.ui.getCore().byId('popoverNav--tf-warnmsg').setText("");
        }

        //clear selected date
        var clearCalendar = function (oCalendar) {
          oCalendar.addSelectedDate(new sap.ui.unified.DateRange({
            startDate: new Date()
          }));
        };

        var oCalendar1 = sap.ui.getCore().byId(
          "popoverNav--calendar1");
        var oCalendar2 = sap.ui.getCore().byId(
          "popoverNav--calendar2");
        clearCalendar(oCalendar1);
        clearCalendar(oCalendar2);

        var oNavCon = sap.ui.core.Fragment.byId("popoverNav", "nav");
        //var oMasterPage = sap.ui.core.Fragment.byId("popoverNav", "master-selection");
        oNavCon.back();
      },

      /**
       * onGlobalTimeFilter - Handle the click event on 'OK' button of time filter dialog
       * @param  {event} oEvent - ui5 event when open time filter
       */
      onGlobalTimeFilter: function (oEvent) {
        //get name of current selected KPI chart
        //this.c1 - index of selected tile on column1
        //this.c2 - index of selected kpi on column2
        var kpiName = this._kpiNames[this._sCategory][this.c1][this.c2];
        //close time filter popover
        sap.ui.getCore().byId("popoverNav--timeFilter").close();
        //get current temporary start/end date
        var fDate = this._tmpStartDate === null ? this._globalStartDate :
          this._tmpStartDate;
        var tDate = this._tmpEndDate === null ? this._globalEndDate : this._tmpEndDate;
        var period = this._tmpPeriod === null ? this._globalPeriod : this._tmpPeriod;

        //if no changes, do nothing
        if (period === this._globalPeriod) {
          if (fDate === this._globalStartDate && tDate === this._globalEndDate) {
            return;
          }

        }
        //check that whether selected period for current KPI is valid
        var msg = "";
        if (!this.isValidPeriod(kpiName, period)) {
          //set error message if selected period is not valid with current KPI
          msg = this.oBundle.getText("invalid_period");
        } else {
          //if period is valid, check the validation of the combination of start/end date and period
          msg = HELPER.periodValidation(fDate, tDate, period);
        }

        //check the validation
        //if msg is not empty, the combination is invalid
        //and the msg is the error message
        if (msg !== "") {
          sap.ui.getCore().byId("warn-msg").setText(this.oBundle.getText(msg));
          this._warnMsgDlg.open();
          sap.ui.getCore().byId("popoverNav--" + this._globalPeriod).setSelected(
            true);
        } else {
          //if msg is empty, the combination is valid
          //set start/end date and period for record
          this._globalStartDate = fDate;
          this._globalEndDate = tDate;
          sap.ui.getCore().byId("popoverNav--" + this._globalPeriod).setSelected(
            false);
          this._globalPeriod = period;
          this._globalPeriodLegend = period

          //get kpi charts belong to selected tile(sub-component)
          //this.c1 - index of selected tile on column1
          var curSubCompCharts = this._kpiCharts[this.c1];

          //since the query time and period(granularity) is changed,
          //all charts need to be reload
          this.loaded = 0;
          //loop to reload all kpi charts on UI
          for (var i = 0; i < curSubCompCharts.length; i++) {
            this.setColumn2ChartModel(curSubCompCharts[i]);
          }

          // remove charts of other sub-components
          for (var j = 0; j < this._kpiCharts.length; j++) {
            if (j !== this.c1) {
              this._kpiCharts[j] = [];
            }
          }
          // remove models of dimension charts and reload current dimension
          // charts
          this.clearDimData();
          //set data model for dimension charts on column 3
          this.setColumn3ChartModel(this._dimCharts[this.selectedDim]);

        }
        // re-load model for kpi charts on column 2
        //get start/end date in proper format
        var dispEndDate = HELPER.getDisplayDate(this._globalPeriod, this._globalEndDate);
        var dispStartDate = HELPER.getDisplayDate(this._globalPeriod, this._globalStartDate);
        this.showDateSelected(this._globalStartDate, this._globalEndDate,
          this._globalPeriod);
        sap.startDate = this._globalStartDate;
        //set start/end date
        sap.ui.getCore().byId("popoverNav--tfStart").setValue(dispStartDate);
        sap.ui.getCore().byId("popoverNav--tfEnd").setValue(dispEndDate);
        sap.ui.getCore().byId("popoverNav--" + this._globalPeriod).setSelected(
          true);
        //clear tmp period and dates
        this._tmpPeriod = null;
        this._tmpStartDate = null;
        this._tmpEndDate = null;

      },

      /**
       * getDefectType - Return the type of oChart
       * @param {vizchart} oChart - the defect chart
       * @param {String} - the type of defect chart
       */
      getDefectType: function (oChart) {
        //get the id of defect chart
        var id = oChart.sId;
        if (id.indexOf("pie") > -1) return "pie";
        else if (id.indexOf("bar") > -1) return "bar";
        else return "dual_combination";
      },

      /**
       * Only Year and Month are the valid period for the KPIs in
       * huawei.cmes.quality.setting.Config.periodSpecKPIs
       * @param oKPI - the name of the KPI
       * @param oPeriod - the granularity of statistical time period, e.g. Year, Month, Week, etc.
       */
      isValidPeriod: function (oKPI, oPeriod) {
        //get the special KPIs
        var specialKPIs = huawei.cmes.quality.setting.Config.periodSpecKPIs;
        //set the valid periods for specialKPIs
        var limitedPeriods = ["YEAR", "MONTH"];
        //to see whether oPeriod is valid for oKPI
        //If valid return true, otherwise return false
        if (specialKPIs.indexOf(oKPI) >= 0 && limitedPeriods.indexOf(oPeriod) <
          0) {
          return false;
        } else return true;
      },

      /**
       * Show selected date on the page
       * @param {String} fDate - the start date of the query
       * @param {String} tDate - the end date of the query
       * @param {String} periodText - the granularity of the statistical time, e.g. Year, Month, Week, etc.
       */
      showDateSelected: function (fDate, tDate, periodText) {
        //get current start date of the query
        var startDate = fDate || this._globalStartDate;
        //get current end date of the query
        var endDate = tDate || this._globalEndDate;
        //get the granularity of the statistical time
        var period = periodText || this._globalPeriod;

        //get the start date in proper format
        startDate = HELPER.getDisplayDate(period, startDate);
        //get the end date in proper format
        endDate = HELPER.getDisplayDate(period, endDate);

        //compose the displaying string for current start and end date of query
        var showDateSelect = this.oBundle.getText('TimePeriod');
        showDateSelect += (startDate + ' - ' + endDate);
        showDateSelect += ' | ';
        showDateSelect += this.oBundle.getText('TimeUnit');
        showDateSelect += this.oBundle.getText(period);

        //set the text on UI control
        this.byId('date-selected-text').setText(showDateSelect);
      },

      /**
       * onPeriodSelect  - this functions is called when new period of query is selected
       * The function is called when use select different period
       * @return {none}
       */
      onPeriodSelect: function () {
        //get the period list from UI
        var periodList = sap.ui.getCore().byId("popoverNav--periodList").getItems();
        //loop the period list to get the selected period
        for (var i = 0; i < periodList.length; i++) {
          if (periodList[i].getSelected()) {
            //get the period from the id of selected item
            var period = periodList[i].getId().split("--")[1];
            this._tmpPeriod = period;
            break;
          }
        }

        //before the validation, new selected dates and period are temporary
        //get temporary period
        this._tmpPeriod = (this._tmpPeriod === null) ? this._globalPeriod :
          this._tmpPeriod;
        //get temporary start date
        this._tmpStartDate = (this._tmpStartDate === null) ? this._globalStartDate :
          this._tmpStartDate;
        //get temporary end date
        this._tmpEndDate = (this._tmpEndDate === null) ? this._globalEndDate :
          this._tmpEndDate;

        //set temporary start date in proper format on UI
        sap.ui.getCore().byId("popoverNav--tfStart").setValue(HELPER.getDisplayDate(
          this._tmpPeriod, this._tmpStartDate));
        //set temporary end date in proper format on UI
        sap.ui.getCore().byId("popoverNav--tfEnd").setValue(HELPER.getDisplayDate(
          this._tmpPeriod, this._tmpEndDate));

        //validate the combination of temporary start date, end date, and period(granularity)
        var msg = HELPER.periodValidation(this._tmpStartDate, this._tmpEndDate, this._tmpPeriod);

        //if msg !== '', it means the combination failed the validation and the msg is the corresponding error message
        if (msg !== '') {
          sap.ui.getCore().byId('popoverNav--tf-okBtn').setEnabled(false);
          sap.ui.getCore().byId('popoverNav--tf-warnmsg').setText("* " + this.oBundle.getText(msg));
        //if msg === '', it means the combination passed the validation
        } else {
          sap.ui.getCore().byId('popoverNav--tf-warnmsg').setText('');
          sap.ui.getCore().byId('popoverNav--tf-okBtn').setEnabled(true);
        }

      },

      /**
       * onTimeFilterPopoverClose - the function is called when user close the time filter popover
       * The function is called when user close time filter popover
       * @param  {Event} oEvent - the ui5 event that use close the popover
       * @return {none}        
       */
      onTimeFilterPopoverClose: function (oEvent) {
        //clear the temporary period
        this._tmpPeriod = null;
        //clear the temporary start date
        this._tmpStartDate = null;
        //clear the temporary end date
        this._tmpEndDate = null;
        //close the time filter popover
        sap.ui.getCore().byId("popoverNav--timeFilter").close();
      },

      /**
       * onSubChartPopoverClose - the function is called when user close the KPI chart dialog
       * The function is called when user close chart popover
       * @param  {Event} oEvent - the ui5 event that use close the KPI chart dialog
       * @return {none}    
       */
      onSubChartPopoverClose: function (oEvent) {
        //close the KPI chart dialog
        this._chartDlg.close();
        //remove the chart 
        $('.v-clippath').remove();
      },

    /**
     * onWarnDlgClose - close warning dialog
     * The function is called when user close the warning dialog
     * @return {none} 
     */
      onWarnDlgClose: function () {
        //close the warning message dialog
        this._warnMsgDlg.close();
      },

      /**
       * navToHomePage - the function is called when user navigate back to home page from report page
       * @return {none} 
       */
      navToHomePage: function () {
        window.location.href = 'index.html';
      },


      /**
       * onViewChartPopover - the function is called when user open the view chart popover
       * @param  {event} oEvent - UI5 event when user open the popover
       * @return {none}        
       */
      onViewChartPopover: function (oEvent) {
        var oButton = oEvent.getSource();

        //open the popover just beside the button
        jQuery.sap.delayedCall(0, this, function () {
          this._defectChartTypePopover.openBy(oButton);
        });
      }

    });
})();
