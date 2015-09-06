/*global huawei:false*/
/*global jQuery:false*/
/*global sap:false*/
/*global localStorage:false*/
//Declear the Formatters
jQuery.sap.declare("huawei.cmes.util.commons.Formatters");
//Require the folder
jQuery.sap.require("sap.ui.core.format.DateFormat");
//Require the folder
jQuery.sap.require("jquery.sap.resources");
//The locale value: en-US|ch-CN
var sLocale = localStorage.getItem('LANG-KEY') || '';
//The translation file
var oBundle = jQuery.sap.resources({
  url: "i18n/messageBundle.properties",
  locale: sLocale
});
//Put the translation file to be global visible
sap.oBundle = oBundle;

var oLaunchPadBundle = jQuery.sap.resources({
  url: "i18n/messageBundle.properties",
  locale: sLocale
});

huawei.cmes.util.commons.Formatters = {
  _oBundle: oBundle,
  _oLaunchPadBundle: oLaunchPadBundle,
  _statusStateMap: {
    "Neu": "Warning",
    "Initial": "Success"
  },

  //Not used
  playButtonIconFormatter: function(bPlay) {
    // console.log("$$$$$$$$$$$$$$$$$$$$$$$$$ playButtonIconFormatter
    // $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
    if (bPlay) {
      return "sap-icon://media-pause";
    } else {
      return "sap-icon://media-play";
    }
  },
  //Not used
  i18nTextFormatter: function(sKey) {
    // console.log("$$$$$$$$$$$$$$$$$$$$$$$$$ i18nTextFormatter
    // $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
    return huawei.cmes.util.commons.Formatters._oBundle.getText(sKey);
  },
  //Not used
  launchpadi18nFormatter: function(sKey) {
    // console.log("$$$$$$$$$$$$$$$$$$$$$$$$$ launchpadi18nFormatter
    // $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
    //return huawei.cmes.util.commons.Formatters._oBundle.getText(sKey);  //00315717 comment translate 
    return sKey;
  },
  //Not used
  TileContentFactory: function(sId, oContext) {
    // console.log("$$$$$$$$$$$$$$$$$$$$$$$$$ TileContentFactory
    // $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
    var sType = oContext.getProperty("type");
    var oTileContent = new sap.suite.ui.commons.TileContent(sId, {
      footer: "{path:'tileConentFooter', formatter:'huawei.cmes.util.commons.Formatters.launchpadi18nFormatter'}",
      size: "{tileConentSize}"
    });
    var oContent;
    switch (sType) {
      case "JamContent":
        oContent = huawei.cmes.util.commons.Formatters.createNumericContent();
        break;
      case "NewsContent":
        oContent = huawei.cmes.util.commons.Formatters.createNewsContent();
        break;
      case "ComparisonChart":
        oContent = huawei.cmes.util.commons.Formatters.createComparisonChart();
        break;
      case "BulletChart":
        oContent = huawei.cmes.util.commons.Formatters.createBulletChart();
        break;
      default:
        oContent = huawei.cmes.util.commons.Formatters.createNumericContent();
    }
    oTileContent.setContent(oContent);
    return oTileContent;
  },
  //Not used
  createNumericContent: function() {
    return new sap.suite.ui.commons.NumericContent({
      icon: "{icon}",
      scale: "{scale}",
      value: "{path:'value', formatter:'huawei.cmes.util.commons.Formatters.launchpadi18nFormatter'}",
      valueColor: "{valueColor}",
      size: "{size}"
    });
  },
  //Not used
  createNewsContent: function() {
    return new sap.suite.ui.commons.NewsContent({
      contentText: "{path:'contentText', formatter:'huawei.cmes.util.commons.Formatters.launchpadi18nFormatter'}",
      size: "{size}",
      subheader: "{path:'subheader', formatter:'huawei.cmes.util.commons.Formatters.launchpadi18nFormatter'}"
    });
  },
  //Not used
  createJamContent: function() {
    return new sap.suite.ui.commons.JamContent({
      size: "{size}",
      contentText: "{path:'contentText', formatter:'huawei.cmes.util.commons.Formatters.launchpadi18nFormatter'}",
      subheader: "{path:'subheader'，formatter:'huawei.cmes.util.commons.Formatters.launchpadi18nFormatter'}",
      value: "{value}"
    });
  },
  //Not used
  createComparisonChart: function() {
    var oCmprsDataTmpl = new sap.suite.ui.commons.ComparisonData({
      title: "{path: 'title', formatter:'huawei.cmes.util.commons.Formatters.launchpadi18nFormatter'}",
      value: "{value}",
      color: "{color}"
    });
    var oCmprsChrtTmpl = new sap.suite.ui.commons.ComparisonChart({
      size: "{size}",
      scale: "{scale}",
      data: {
        template: oCmprsDataTmpl,
        path: "chartdata"
      }
    });
    return oCmprsChrtTmpl;
  },
  //Not used
  createBulletChart: function() {
    var oBCDataTmpl = new sap.suite.ui.commons.BulletChartData({
      value: "{value}",
      color: "{color}"
    });
    var BulletChartTmpl = new sap.suite.ui.commons.BulletChart({
      size: "{sizes}",
      scale: "{scale}",
      width: "{width}",
      targetValue: "{chartdata/targetValue}",
      minValue: "{chartdata/minValue}",
      maxValue: "{chartdata/maxValue}",
      actual: {
        value: "{chartdata/actual/value}",
        color: "{chartdata/actual/color}"
      },
      thresholds: {
        template: oBCDataTmpl,
        path: "chartdata/thresholds"
      },
      showActualValue: "{chartdata/showActualValue}",
      showTargetValue: "{chartdata/showTargetValue}",
      actualValueLabel: "{path:'chartdata/actualValueLabel', formatter:'huawei.cmes.util.commons.Formatters.launchpadi18nFormatter'}",
      targetValueLabel: "{path:'chartdata/targetValueLabel', formatter:'huawei.cmes.util.commons.Formatters.launchpadi18nFormatter'}"
    });

    return BulletChartTmpl;
  },

  /**
   * Fill the left bits 补齐左边的数字
   * @param iTargetLength
   * @param iNumber
   * @param iCharater
   * @returns {String}
   */
  leftFillGap: function(iTargetLength, iNumber, iCharater) {
    var cntLoop = iTargetLength - parseInt(iNumber.toString().length);
    var oNumber = "001";
    for (var i = 0; i < cntLoop; i++) {
      iNumber = iCharater + iNumber.toString();
      oNumber = iNumber;
    }
    return oNumber;
  },
  
  /**
   * 
   * @param iNumber
   * @param iStep
   * @returns
   */
  stringAutoPlus: function(iNumber, iStep) {
    var preLength = iNumber.length;
    var oNumber = parseInt(iNumber) + iStep;
    return this.leftFillGap(preLength, oNumber, "0").toString();
  },
  
  /**
   * 
   * @param $
   * @returns
   */
  ConvertoInteger: function($) {
    var iInteger = Math.round($);
    return iInteger;
  },
  
  /**
   * 
   * @param bFlag
   * @returns {String}
   */
  ProgbarBackgroudcolorFormatter: function(bFlag) {
    if (bFlag) {
      return "POSITIVE"; // green
    } else {
      return "NEGATIVE"; // red
    }
  },

  /**
   * 
   * @param bFlag
   * @returns
   */
  getCategory: function(bFlag) {
    if (bFlag === '0') {
      return huawei.cmes.util.commons.Formatters._oBundle.getText('network_name');
    } else {
      return huawei.cmes.util.commons.Formatters._oBundle.getText('terminal_name');
    }
  },

  /**
   * 
   * @param bFlag
   * @returns
   */
  textBackgroudcolorFormatter: function(bFlag) {
    if (bFlag) {
      return sap.ui.commons.TextViewColor.Default; // black
    } else {
      return sap.ui.commons.TextViewColor.Negative; // red
    }
  },

  /**
   * 
   * @param value
   * @returns
   */
  chartMeasureFormatter: function(value) {
    console.log(value);
    if (value === 'YEAR') {
      return huawei.cmes.util.commons.Formatters._oBundle.getText('CurrentYearValue');
    } else if (value === 'YEAR,QUARTER') {
      return huawei.cmes.util.commons.Formatters._oBundle.getText('CurrentQuartorValue');
    } else if (value === 'YEAR,MONTH') {
      return huawei.cmes.util.commons.Formatters._oBundle.getText('ActualValue');
    } else if (value === 'YEAR,WEEK') {
      return huawei.cmes.util.commons.Formatters._oBundle.getText('CurrentWeekValue');
    } else if (value === 'YEAR,MONTH,DAY') {
      return huawei.cmes.util.commons.Formatters._oBundle.getText('CurrentDayValue');
    } else {
      return huawei.cmes.util.commons.Formatters._oBundle.getText('ActualValue');
    }
  },

  /**
   * 
   * @param value
   * @param type
   * @returns {String}
   */
  chartPeriodFormatter: function(value, type) {
    var months = ['Jan', 'Feb', 'March', 'Apr', 'May', 'June', 'July', 'Aug',
      'Sept', 'Oct', 'Nov', 'Dec'
    ];
    if (value === null)
      return;
    var date = '';

    if (type === "") {

      var dates = value.split("-");
      switch (dates.length) {
        case 1:
          date = dates[0];
          break;
        case 2:
          if (value.indexOf("Q") > -1) {
            // date = months[parseInt(dates[1]) - 1];

            date = 'Q' + parseInt(dates[1]);
          }

          if (value.indexOf("W") > -1) {
            date = 'W' + parseInt(dates[1]);
          } else {
            date = dates[0] + '.' + dates[1];
          }
          break;
        case 3:
          date = parseInt(dates[2]);
          break;

      }

    } else {

      switch (type.toUpperCase()) {
        case 'DAY':
          date = value.substring(6);
          break;
        case 'WEEK':
          date = 'CW' + value.substring(4);
          break;
        case 'MONTH':
          date = value.substring(4);
          break;
        case 'YEAR':
          date = value;
          break;
      }
    }
    return date;
  },

  /**
   * ChinaOverviewPage.controller.js 763 Line
   * @param {String} value -
   * return {String} - get translation from i18n
   */
  KPIChartLengendFormatter: function(value) {
    var data = "";
    switch (value) {
      case "P":
        data = oBundle.getText("ActualValue");
        break;
      case "T":
        data = oBundle.getText("TargetValue");
        break;
      case "C":
        data = oBundle.getText("calc_value");
        break;
      case "F":
        data = oBundle.getText("chanllenge_value");
        break;
      case "实际":
        data = oBundle.getText("ActualValue");
        break;
      case "目标":
        data = oBundle.getText("TargetValue");
        break;
      case "target_value":
        data = oBundle.getText("TargetValue");
        break;
      case "actual_value":
        data = oBundle.getText("ActualValue");
        break;
    }
    return data;
  },

  /**
   * Formater for index page name formatter
   * @param  {String} value - raw data
   * @return {String} - processed data
   */
  dashBoardTileNameFomatter: function(value) {
    var newValue = '';
    switch (value) {
      case 'T01':
        newValue = oBundle.getText('TerminalQuality');
        break;
      case 'T02':
        newValue = oBundle.getText('TerminalDelivery');
        break;
      case 'N01':
        newValue = oBundle.getText('NetworkQuality');
        break;
      case 'N02':
        newValue = oBundle.getText('NetworkDelivery');
        break;
    }

    return newValue;
  },

  /**
   * Get data from Tile- the control and map it to each accuracy data
   * @param  {String} kpiTile
   * @return {String}
   */
  getKpiAccuracy: function(kpiTile) {
    var modelData = kpiTile.getModel().getData();
    var paths = kpiTile.getBindingContext().getPath().split('/');
    var path1 = paths[1]; //0
    var path2 = paths[2]; //0 to 3 - 4 tiles on index page
    var path3 = paths[3]; //0 to 4 - 4 content in each tile

    var targetKpi = modelData[path1][path2][path3];
    var targetKpiName = targetKpi.KPI_NAME; //Get Kpi Name

    //With Kpi Name and get the accuracy
    var accuracy = huawei.cmes.util.commons.Formatters.getAccuracy(targetKpiName);

    return accuracy;
  },

  /**
   * Get the accuracy of kpi
   * @param  {String} kpi name
   * @return {int} the corresponding kpi accuracy
   */
  getAccuracy: function(kpi) {
    var kpiAccuracyMapping = {
      FPY: 2,
      TPY: 2,
      PY: 2,
      MMIN: 1,
      CCN: 1,
      FCC: 2,
      FCMR: 2,
      FSCMR: 2,
      FCV: 2,
      PIV: 2,
      TCC: 2,
      TCMR: 2,
      TIV: 2,
      TCV: 2,
      RIDPPM: 0,
      FDPPM: 1,
      MMQI: 1,
      DDR: 0,
      MMIN02: 1,
      DFR: 0,
      CCI: 1,
      MMIN01: 1,
      MPQI: 1
    };

    //If undefined, return 0
    if (kpiAccuracyMapping[kpi] === undefined) {
      return 0;
    } else {
      return kpiAccuracyMapping[kpi];
    }
  },

  /**
   * KPI value formatter
   * @param  {String} data
   * @return {[type]}      [description]
   */
  kpiValueNumberFormatter: function(data) {
    var noDataClassName = 'kpi-no-data-value-cn';
    if (sLocale === 'en-US') {
      noDataClassName = 'kpi-no-data-value-en';
    }
    if (data === 'NO_DATA') {
      this.addStyleClass(noDataClassName);
      return sap.oBundle.getText('NO_DATA');
    } else if (data === 'NO_AUTH') {
      this.addStyleClass(noDataClassName);
      return sap.oBundle.getText('NO_AUTH');
    }

    var accuracy = huawei.cmes.util.commons.Formatters.getKpiAccuracy(this);
    var formatteredValue = huawei.cmes.util.commons.Formatters.kpiValueFormatter(
      data, accuracy);
    var length = formatteredValue.length;
    var expo = parseInt(formatteredValue.substring(length - 1, length));
    var number = formatteredValue;
    if (isNaN(expo)) {
      number = formatteredValue.match(/\d+\.*\d+/g)[0];
    }

    if (sLocale === 'en-US') {
      this.removeStyleClass('kpi-chinese-value');
      this.addStyleClass('kpi-english-value');
      return formatteredValue;
    } else {
      this.removeStyleClass('kpi-english-value');
      this.addStyleClass('kpi-chinese-value');
      return number;
    }
  },

  /**
   * Notation
   * @param  {String} data
   * @return {String} - CH science notation
   */
  kpiValueExpoFormatter: function(data) {
    if (data === 'NO_DATA' || data === 'NO_AUTH') {
      return '';
    }
    var accuracy = huawei.cmes.util.commons.Formatters.getKpiAccuracy(this);
    var formatteredValue = huawei.cmes.util.commons.Formatters.kpiValueFormatter(
      data, accuracy);
    var length = formatteredValue.length;
    var expo = formatteredValue.substring(length - 1, length);
    if (!isNaN(parseInt(expo))) {
      expo = '';
    }

    if (sLocale === 'en-US') {
      return '';
    } else if (formatteredValue.match(
        /[\u4e00-\u9fa5]+/g) !== null) {
      return formatteredValue.match(/[\u4e00-\u9fa5]+/g)[0];
    } else {
      return '';
    }
  },

  /**
   * Formatter for global dashboard card values
   * @param data
   * @returns formattered data
   */
  dashboardGlobalCardFormatter: function(data) {
    var formatteredValue = huawei.cmes.util.commons.Formatters.kpiValueFormatter(
      data, 2);
    return formatteredValue;
  },

  /**
   * KPI value scientific notation
   * @param  {String} data - number
   * @param  {precision} fixed - precision
   * @return {[type]}
   */
  kpiValueFormatter: function(data, fixed) {
    var value = parseFloat(data);
    var fixvalue = parseFloat(fixed);
    if (isNaN(fixvalue)) {
      fixed = 1;
    }
    if (isNaN(value)) {
      return '';
    }
    if (sLocale === 'en-US') {
      if (value >= 1000000000) {
        value = (value / 1000000000).toFixed(fixed) + 'B';
      } else if (value >= 1000000 && value < 10000000) {
        value = (value / 100000).toFixed(fixed) + 'B';
      } else if (value >= 1000 && value < 1000000) {
        value = (value / 1000).toFixed(fixed) + 'K';
      } else if (value < 1) {
        // this.addStyleClass && this.addStyleClass('percentage-label-text');
        //        value = (value * 100).toFixed(2) + '%';
        value = (value).toFixed(fixed);
      } else {
        value = (value).toFixed(fixed);
      }
    } else {
      if (value >= 100000000) {
        value = (value / 100000000).toFixed(fixed) + '亿';
      } else if (value >= 10000000 && value < 100000000) {
        value = (value / 10000000).toFixed(fixed) + '千万';
      } else if (value >= 10000 && value < 10000000) {
        value = (value / 10000).toFixed(fixed) + '亿';
      } else if (value >= 1000 && value < 10000) {
        value = (value / 10000).toFixed(fixed) + '万';
      } else if (value < 1) {
        // this.addStyleClass && this.addStyleClass('percentage-label-text');
        value = (value).toFixed(fixed);
      } else {
        value = (value).toFixed(fixed);
      }
    }
    return value;
  },

  //0 means it is network
  //1 means it is terminal
  /**
   * return the value after precision calculation
   * @param  {String} type  0 means it is network | 1 means it is terminal
   * @param  {String} data
   * @param  {int} fixed - precision number
   * @return {String}
   */
  deliveryChartValueFormatter: function(type, data, fixed, unit, pfkey) {
    var value = parseFloat(data);
    if (isNaN(value)) {
      return '';
    }
    //修改100000000为10000  修改人：xiezengguang
    //not add Billion or  亿 万
    //    if (sLocale === 'en-US') {
    /*
    if (type === '0') {
      value = (value / 100000000).toFixed(fixed);
    } else {
      value = (value / 10000).toFixed(fixed);
    }
    */
    /**
     * 修改原因：增加接收参数unit用于判断是整机或是半成品
     * 修改if语句判断条件 pfkey(0整机或1半成品) type(0泛网络或1终端)
     * 修改人：xiezengguang WX286528
     */
    if (unit === "WRMB" || pfkey === '0') {
      value = (value / 10000).toFixed(fixed);
    } else if ((unit === "PCS" && type === '0') || pfkey === '1') {
      value = (value / 100000000).toFixed(fixed);
    } else if (type === '1') {
      value = (value / 10000).toFixed(fixed);
    }


    //    } else {
    //      if (type === '0') {
    //        value = (value / 100000000).toFixed(fixed) + '';
    //      } else {
    //        value = (value / 10000).toFixed(fixed) + '10 Thousand';
    //      }
    //    }
    return value;
  },

  //Not used | may use in future
  deliveryChartUnitFormatter: function() {

  },

  /**
   * Set Float precision to 2 | not used anymore
   * 精度设置为2
   * @param  {String} data - raw string
   * @return {String} - formattered string
   */
  kpiTargetFormatter: function(data) {
    var value = parseFloat(data);
    if (value < 1 && !isNaN(value)) {
      if (this.addStyleClass !== undefined) {
        this.addStyleClass('percentage-label-target-text');
      }
      value = (value).toFixed(2);
      return value;
    } else {
      return '';
    }
  },

  /**
   * kpi value formatter for tooltip | index page
   * add number spliter ex. 12323123 to 12,323,123
   * @param  {String} data - raw data
   * @return {String}
   */
  kpiValueTooltipFormatter: function(data) {
    var isFloat = String(data).match(/\./) !== null;
    if (data === 'NO_DATA') {
      throw 'No Data!';
    } else if (data === 'NO_AUTH') {
      throw 'No Authorization!';
    }
    var dataString = String(data).match(/\d+/g)[0];

    var dataArray = dataString.split('');
    var length = dataArray.length;
    var newData = [];
    dataArray.forEach(function(d, index) {
      if ((length - index) % 3 === 0) {
        newData.push(' ' + d);
      } else {
        newData.push(d);
      }
    });

    newData = newData.join('');
    if (isFloat) {
      newData = newData + String(data).match(/\..+/g)[0];
    }

    return newData;
  },

  /**
   * Get the translation of kpi Names
   * @param  {String} data - KPI raw name
   * @return {String} - the translated raw name
   */
  kpiNameFormatter: function(data) {
    var value = data;
    switch (data) {
      case 'FPY':
        value = oBundle.getText('StraightRate');
        break;
      case 'TPY':
        value = oBundle.getText('TPY_FULL_NAME');
        break;
      case 'PY':
        value = oBundle.getText('TPY_FULL_NAME');
        break;
      case 'MMIN01':
        value = oBundle.getText('MMIN01_FULL_NAME');
        break;
      case 'MMIN02':
        value = oBundle.getText('MMIN02_FULL_NAME');
        break;
      case 'MMIN':
        value = oBundle.getText('BatchQualityProblem');
        break;
      case 'CCN':
        value = oBundle.getText('ChallengeNumber');
        break;
      case 'FFR':
        value = oBundle.getText('ReturnRate');
        break;
      case 'TIV':
        value = oBundle.getText('InStockQuantity');
        break;
      case 'TCV':
        value = oBundle.getText('DeliveryQuantity');
        break;
      case 'TCMR':
        value = oBundle.getText('InTimeFinishRate');
        break;
      case 'FCMR':
        value = oBundle.getText('InTimeFinishRate');
        break;
      case 'TCC':
        value = oBundle.getText('TProcessPeriod');
        break;
      case 'ERI':
        value = oBundle.getText('ChipReturnRate');
        break;
      case 'PIV':
        value = oBundle.getText('ChipProduction');
        break;
      case 'FCV':
        value = oBundle.getText('DesktopProductionValue');
        break;
      case 'FSCMR':
        value = oBundle.getText('InTimeFinishRate');
        break;
      case 'FCC':
        value = oBundle.getText('FProcessPeriod');
        break;
      case 'MQI':
        value = oBundle.getText('MassQualityIssue');
        break;
      case 'LAR':
        value = oBundle.getText('LotAcceptedRat');
        break;
      case 'RIDPPM':
        value = oBundle.getText('RejectIncomingDefectPcsPerMillion');
        break;
      case 'FDPPM':
        value = oBundle.getText('FactoryDefectedPiecesPerMillio');
        break;
      case 'MMQI':
        value = oBundle.getText('MajorMaterialQualityIssue');
        break;
      case 'DPMO':
        value = oBundle.getText('DefectsPerMillionOpportunitie');
        break;
      case 'DDR':
        value = oBundle.getText('DeliveryDefectRate');
        break;
      case 'MPQI':
        value = oBundle.getText('MajorProcessQualityIssu');
        break;
      case 'COM':
        value = oBundle.getText('CARCommonProblemAndCorrectiveActionRequest');
        break;
      case 'DFR':
        value = oBundle.getText('DeploymentFailureRat');
        break;
      case 'CCR':
        value = oBundle.getText('CustomerComplainRate');
        break;
      case 'RRST':
        value = oBundle.getText('RepairRatefortheSecondTim');
        break;
      case 'DPPM':
        value = oBundle.getText('DefectivePartsPerMillio');
        break;
      case 'CCI':
        value = oBundle.getText('CustomercomplaintIndex');
        break;
      case 'DOA':
        value = oBundle.getText('DAPDeadOnArrivalAndDeadAfterPurchase');
        break;
    }

    //If it is english language, return what it is
    if (this.addStyleClass !== undefined) {
      if (sLocale === 'en-US') {
        this.addStyleClass('kpi-name-en');
      } else {
        this.addStyleClass('kpi-name-cn');
      }
    }

    return value;
  },

  /**
   * Unit formatter
   * @param  {String} data - raw data for unit
   * @return {String}
   */
  unitFormatter: function(data) {
    var value = data;
    switch (data) {
      case "PCS_Q":
        value = oBundle.getText('UnitOfCustomerComplain');
        break;
      case "起":
        value = oBundle.getText('UnitOfCustomerComplain');
        break;
      case "DAY":
        value = oBundle.getText('UnitOfPeriodDay');
        break;
      case "天":
        value = oBundle.getText('UnitOfPeriodDay');
        break;
      case "PER":
        value = oBundle.getText('UnitOfPercentage');
        break;
      case "%":
        value = oBundle.getText('UnitOfPercentage');
        break;
      case "RMB":
        value = oBundle.getText('UnitOfRMB');
        break;
      case "元":
        value = oBundle.getText('UnitOfRMB');
        break;
      case "台":
        value = oBundle.getText('UnitOfPCS');
        break;
      case "PCS_J":
        value = oBundle.getText('UnitOfPCSJ'); //件
        break;
      case "PCS_K":
        value = oBundle.getText('UnitOfPCSK'); //件
        break;
      case "PCS_T":
        value = oBundle.getText('UnitOfPCST'); //件
        break;
    }
    return value;
  },

  /**
   * EN-CH Number Formatter en-K,M; ch-万,亿
   * @param  {String} data - raw data
   * @return {String}
   */
  moneyFormatter: function(data) {
    var value = data;
    var index = 0;
    if (sLocale === 'en-US' && value !== null && value !== undefined) {
      /*console.log(value);*/
      if (value.indexOf('亿') !== -1) {
        value = value.match(/\d+(\.)*(\,)*(\.)*\d+/g)[0];
        if (value.indexOf(',') !== -1) {
          index = value.indexOf(',');
          value = value.substr(0, index) + value.substr(index + 1);
        }
        return (value / 10).toString().match(/\d+(\,)*(\.)*\d{2}/g)[0] +
          ' Billion';
      } else if (value.indexOf('万') !== -1) {
        value = value.match(/\d+(\.)*(\,)*(\.)*\d+/g)[0]; // 188,322.5
        if (value.indexOf(',') !== -1) {
          index = value.indexOf(',');
          value = value.substr(0, index) + value.substr(index + 1);
        }
        return value * 10 + ' Thousand';
      }
    }
    return value;

  },

  /**
   * Color formatter | index page
   * 打灯 formatter
   * @param  {String} data
   * @return {String}
   */
  kpiColorFormatter: function(data) {
    var value = data;
    //Updated
    if (data === null || data === undefined || data === 'NO_AUTH' || data === 'NO_DATA') {
      value = 'gray';
      return value;
    }
    //***

    switch (data) {
      case "0":
        value = '#b51616'; // Red
        break;
      case "1":
        value = 'yellow';
        break;
      case "2":
        value = 'green';
        break;
    }
    return value;
  },

  /**
   * Enginnering page color formatter
   * EMS factory list table
   * @param {String} data [description]
   * @param {String} type [description]
   */
  ENGAlarmkpiColorFormatter: function(data, type) {
    var stype = type;
    var value = 'green';

    if (parseInt(data) >= 1 && parseInt(data) <= 10) {
      value = 'orange';
    } else if (parseInt(data) > 10) {
      value = 'red';
    }
    return value;
  },

  /**
   * Not used | not dare delete
   */
  floatFormatter: function(data) {
    /*console.log(data);*/
    if (data !== '' && data !== undefined && data !== null) {
      var n = 2;
      var value = data;
      value = parseFloat((value + "").replace(/[^\d\.-]/g, "")).toFixed(n) + "";
      var l = value.split(".")[0].split("").reverse();
      var r = value.split(".")[1];
      var t = "";
      for (var i = 0; i < l.length; i++) {
        t += l[i] + ((i + 1) % 3 === 0 && (i + 1) != l.length ? "," : "");
      }
      return t.split("").reverse().join("") + "." + r;
    }
    return data;
  },

  /**
   * generate comparison data for delivery page plan&output chart
   * @param  {Object} data          raw data from server
   * @param  {Object} selectedItems Not used
   * @return {Object}               processed data
   */
  generateComparisonData: function(data, selectedItems) {
    var compareName1 = "";
    var compareName2 = "";
    var key1 = '';
    var key2 = '';
    var comparsionData = [];
    var compareChartName = sap.compareChartName;
    //If it cannot compare, return ''
    if (compareChartName === 'cannotCompare') {
      return false;
    }

    //Different comparison has different names on lengend
    /**
     * 修改compareChartName === 'deliverRate'的key2 ='Release'
     * 修改为 key2 = 'Plan'
     */
    if (compareChartName === 'planExecRate') {
      compareName1 = 'Release';
      compareName2 = 'Plan';
      key1 = 'Release';
      key2 = 'Plan';
    } else if (compareChartName === 'outputExecRate') {
      compareName1 = 'Output';
      compareName2 = 'Release';
      key1 = 'Output';
      key2 = 'Release';
    } else if (compareChartName === 'inboundExecRate') {
      compareName1 = 'Inbound';
      compareName2 = 'Release';
      key1 = 'Output';
      key2 = 'Release';
    } else if (compareChartName === 'deliverRate') {
      compareName1 = 'Deliver';
      compareName2 = 'Release';
      key1 = 'Output';
      key2 = 'Plan';
    }
    for (var rec in data) {
      //If the value is 0, which cannot be the divider, make it ''
      /**
       * 修改原因:
       * 1,data取值为String类型,data[rec][key2] === 0 无法进行判断，parseInt(data[rec][key2])===0 || data[rec][key2]==="".
       * 2,此处：value = (data[rec][key1] / data[rec][key2]*100).toFixed(2)
       * String类型无法进行计算.故修改为value = ((parseInt(data[rec][key1]) / (parseInt(data[rec][key2])*100)).toFixed(2)) ;
       * 修改人:xiezengguang WX286528
       */
      //alert(Object.prototype.toString.apply(data[rec][key1]));
      //data[rec][key2]是String类型
      //alert(parseInt(data[rec][key2])===0);
      //alert(data[rec][key2]==="");
      //alert(parseInt(data[rec][key2]).toFixed(2));
      //alert(data[rec].DATE);
      //data[rec][key1]发货量
      //alert(data[rec]['Release']);
      if (parseInt(data[rec][key2]) === 0 || data[rec][key2] === "") {
        comparsionData.push({
          DATE: data[rec].DATE,
          Compare: ""
        });
      } else {
        //get the ratio and make the accuracy to 2
        value = (data[rec][key1] / data[rec][key2] * 100).toFixed(2);
        /*
        var reckeyone = parseInt(data[rec][key1]);
        var reckeytwo = parseInt(data[rec][key2])*100;
        value = (reckeyone / reckeytwo).toFixed(2);       
        */
        //alert("data[rec][key1]==="+data[rec][key1]+"||"+"data[rec][key2]==="+data[rec][key2]); 
        //alert("TheValues==="+value);
        comparsionData.push({
          DATE: data[rec].DATE,
          Compare: value
        });
      }

    }
    return comparsionData;
  },

  /**
   * build favorite BO URL
   * @param  {Object} buildChartData - raw data contain the url info
   * @param  {String} kpiID
   * @return {String} BO url
   */
  buildBOUrl: function(buildChartData, kpiID) {
    var url = '?';
    var dimensionData = buildChartData.DIMENSIONS;
    var dateData = buildChartData.DATE;
    for (var prop in dimensionData) {
      url += ('s' + prop + "=''");
      var propContent = dimensionData[prop];
      propContent = propContent.map(function(item) {
        var name = item.ID || item.NAME;
        name = name.replace(/\&/g, '%26');
        return name;
      });
      url += propContent.join("'',''");
      url += "''&";
    }
    url += ('sDate=' + dateData.START_DATE + '&');
    url += ('eDate=' + dateData.END_DATE + '&');
    url += ('sDATATYPE=' + dateData.PERIOD + '&');
    url += 'sKPINAME=' + kpi + '&sFilterNAME= &sFilterVALUE= ';

    return url;
  },

  /**
   * replace XSJS
   * reconstruct the contructure of the raw data got from server
   * @type {Object}
   */
  dataCleaner: {
    /**
     * Clean Dimension Data
     * @param  {Array} data [Dimension Data]
     * @return {Array} [Cleaned Dimension Data]
     */
    dimension: function(data) {
      var dimensions = {};
      var ids = [];
      /**
       * Whether d is existed in array
       * @param  {String}  d - the target String
       * @param  {Array}  array - the target array
       * @return {Boolean}
       */
      var isExist = function(d, array) {
        var exist = false;
        array.forEach(function(dataItem) {
          if (dataItem.NAME === d.NAME) {
            exist = true;
          }
        });
        return exist;
      };
      data.forEach(function(item) {
        var index = item.INDEX; // the codes represent the dimension names
        var id = '-1';

        /** [Mapping] */
        switch (index) {
          case '0':
            id = 'AREA';
            break;
          case '1':
            id = 'BG';
            break;
          case '2':
            id = 'FACTORY';
            break;
          case '3':
            id = 'PRODUCT_ABC';
            break;
          case '4':
            id = 'PRODUCT_FORM';
            break;
          case '5':
            id = 'PRODUCT_LINE';
            break;
        }

        //First
        if (ids.indexOf(id) === -1) {
          ids.push(id);
          //If is not BG add Select ALl in the select control
          if (index !== '1') {
            dimensions[id] = [{
              NAME: sap.oBundle.getText('SELECT_ALL'),
              ID: 'SELECT_ALL'
            }];
          } else {
            dimensions[id] = [];
          }
        }

        var dimensionObj = {
          NAME: item.NAME,
          ID: item.ID || item.NAME
        };
        if (!isExist(item, dimensions[id])) {
          //Push it into dimensions
          dimensions[id].push(dimensionObj);
        }
      });

      return dimensions;
    },


    /**
     * For getting new dimension data after the value of single selection control is changed
     * @param  {Object} data - raw data from server
     * @return {Array}
     */
    filterDimension: function(data) {
      var dimensions = {};
      var ids = [];
      var isExist = function(d, array) {
        var exist = false;
        array.forEach(function(dataItem) {
          if (dataItem.NAME === d.NAME) {
            exist = true;
          }
        });
        return exist;
      };
      data.forEach(function(item) {
        var index = item.INDEX;
        var id = '-1';

        /** [Mapping] */
        switch (index) {
          case '0':
            id = 'AREA';
            break;
          case '1':
            id = 'BG';
            break;
          case '2':
            id = 'FACTORY';
            break;
          case '3':
            id = 'PRODUCT_ABC';
            break;
          case '4':
            id = 'PRODUCT_FORM';
            break;
          case '5':
            id = 'PRODUCT_LINE';
            break;
        }

        //First
        if (ids.indexOf(id) === -1) {
          ids.push(id);
          //If is not BG add Select ALl in the select control
          dimensions[id] = [];
        }

        var dimensionObj = {
          NAME: item.NAME,
          ID: item.ID || item.NAME
        };

        if (!isExist(item, dimensions[id])) {
          dimensions[id].push(dimensionObj);
        }

      });
      //When dimension is not BG need 'SELECT_ALL' Item
      for (var dimension in dimensions) {
        if (dimension !== 'BG') {
          dimensions[dimension].unshift({
            NAME: sap.oBundle.getText('SELECT_ALL'),
            ID: 'SELECT_ALL'
          });
        }
        //When it is IE 10 reverse the array of the dropdown box
        if (navigator.userAgent.indexOf('MSIE') !== -1) {
          dimensions[dimension].reverse();
        }
      }

      return dimensions;
    },

    /**
     * Processer of the raw data of on time devlivery service
     * @param  {Object} data - raw data
     * @param  {String} kpi - kpi name
     * @return {Object} - processed data
     */
    onTimeFinishData: function(data, kpi) {
      var byDate = {};
      var measures = [];
      //Loop
      data.forEach(function(item) {
        var itemName = item.FILTER_VALUE;
        var cmrValue = item[kpi];
        var year = item.DATA_YEAR;
        var month = item.DATA_TYPE;
        var date = year + '-' + month; //Date

        if (!byDate[date]) {
          byDate[date] = {};
        }
        if (!byDate[date][itemName]) {
          byDate[date][itemName] = cmrValue;
          if (measures.indexOf(itemName) === -1 && itemName !== '') {
            measures.push(itemName);
          }
        }
      });

      var byDateAllData = [];
      var createData = function(byDate, prop) {
        var byDateData = byDate[prop];
        byDateData.DATE = prop;
        return byDateData;
      };
      for (var prop in byDate) {
        byDateAllData.push(createData(byDate, prop));
      }

      //Get measures
      measures = measures.map(function(measure) {
        var tempMeasure = {};
        tempMeasure.name = measure;
        tempMeasure.value = '{' + measure + '}';
        return tempMeasure;
      });

      return {
        data: byDateAllData,
        measure: measures
      };
    },

    /**
     * Processer of the raw data of plan&output service
     * @param  {Object} data - raw data
     * @return {Object} - processed data
     */
    onPlanOutputProcessData: function(data) {
      //Data
      /*{
        "DIMENSION": "深圳供应中心",
        "PERIOD": "11",
        "KPI_VALUE": "10286630"
        }, {
        "DIMENSION": "",
        "PERIOD": "12",
        "KPI_VALUE": ""
        }]*/
      var dimensionData = [];
      var dimensionNames = [];
      var emptyPeriod = '';
      data.forEach(function(item) {
        var period = item.PERIOD;
        var dimension = item.DIMENSION;
        //Record the empty one, get the period
        if (dimension === '') {
          emptyPeriod = period;
        } else {
          dimensionNames.push(dimension);
          dimensionData.push(item);
        }
      });

      //      dimensionNames.forEach(function (name) {
      //        var newDiemsionData = {
      //          DIMENSION: name,
      //          FILTER_VALUE: '',
      //          PERIOD: emptyPeriod
      //        };
      //        dimensionData.push(newDiemsionData);
      //      });

      return dimensionData;
    },


    /**
     * get plan release and output selecion on dialog
     * @param  {String} _pflag - whether the checkbox is selected
     * @param  {String} _rflag - whether the checkbox is selected
     * @param  {String} _cflag - whether the checkbox is selected
     * @return {String}
     */
    onGetCPRchoose: function(_pflag, _rflag, _cflag) {
      if (_pflag) {
        _pflag = '1';
      } else {
        _pflag = '0';
      };
      if (_rflag) {
        _rflag = '1';
      } else {
        _rflag = '0';
      };
      if (_cflag) {
        _cflag = '1';
      } else {
        _cflag = '0';
      };

      var CPRchoose = "''''''" + _pflag + _rflag + _cflag + "''''''";
      return CPRchoose;
    },

    /**
     * Create url for All Build urls
     * @param  {Object} buildChartData - raw data from service
     * @param  {String} kpi - kpi names
     * @return {Object}
     */
    buildUrl: function(buildChartData, kpi) {
      var url = '?';
      var dimensionData = buildChartData.DIMENSIONS;
      var dateData = buildChartData.DATE;
      for (var prop in dimensionData) {
        url += ('s' + prop + "=''");
        var propContent = dimensionData[prop];
        propContent = propContent.map(function(item) {
          var name = item.ID || item.NAME;
          name = name.replace(/\&/g, '%26');
          return name;
        });
        url += propContent.join("'',''");
        url += "''&";
      }
      url += ('sDate=' + dateData.START_DATE + '&');
      url += ('eDate=' + dateData.END_DATE + '&');
      url += ('sDATATYPE=' + dateData.PERIOD + '&');
      url += 'sKPINAME=' + kpi + '&sFilterNAME= &sFilterVALUE= ';

      return url;
    },

    /**
     * Create build String for plan and output posting
     * @param  {Object} dimensionData - dimension data
     * @param  {String} kpi - kpi name
     * @param  {Object} dateData - date data
     * @return {Object}
     */
    buildDimensionPostString: function(dimensionData, kpi, dateData) {
      var url = '?';
      for (var prop in dimensionData) {
        url += ('s' + prop + "=");
        var propContent = dimensionData[prop];
        propContent = propContent.map(function(item) {
          var name = item.ID || item.NAME;
          name = name.replace(/\&/g, '%26');
          return "''" + name + "''";
        });
        url += propContent.join(",");
        url += "&";
      }
      url += 'sPAGEID=D0&sKPINAME=' + kpi;
      if (dateData !== undefined) {
        url += ('&sDate=' + dateData.START_DATE + '&');
        url += ('eDate=' + dateData.END_DATE);
      }
      return url;
    },

    /**
     * Create build String for posting
     * @param  {Object} dimensionData - dimension data
     * @param  {String} kpi - kpi name
     * @param  {Object} dateData - date data
     * @return {Object}
     */
    buildUrlForPost: function(buildChartData, kpi) {
      var url = '?';
      var dimensionData = buildChartData.DIMENSIONS;
      for (var prop in dimensionData) {
        url += ('s' + prop + "=");
        var propContent = dimensionData[prop];
        propContent = propContent.map(function(item) {
          var name = item.ID || item.NAME;
          name = name.replace(/\&/g, '%26');
          return "''" + name + "''";
        });
        url += propContent.join(",");
        url += "&";
      }
      url += 'sPAGEID=D0&sKPINAME=KPI_' + kpi;

      return url;
    },

    /**
     * Create filter url
     * @param  {Object} filterData - get from front end
     * @return {String}
     */
    filterUrl: function(filterData) {
      var filterUrl = "&sFilterNAME=";
      var filterNames = [],
        i = 0;
      for (filterNames[i++] in filterData);

      var filterName = filterNames[0];
      var filterNameId = filterName;
      switch (filterNameId) {
        case '产品形态':
          filterNameId = 'PROD_FORM';
          break;
        case 'Product Form':
          filterNameId = 'PROD_FORM';
          break;
        case '区域':
          filterNameId = 'AREA_NAME';
          break;
        case 'Area':
          filterNameId = 'AREA_NAME';
          break;
        case '产品线':
          filterNameId = 'PROD_LINE';
          break;
        case 'Product Line':
          filterNameId = 'PROD_LINE';
          break;
        case '产品 ABC':
          filterNameId = 'PROD_ABC';
          break;
        case 'Product ABC':
          filterNameId = 'PROD_ABC';
          break;
        case '产地':
          filterNameId = 'FACT_NAME';
          break;
        case 'Factory':
          filterNameId = 'FACT_NAME';
          break;
      }
      filterUrl += (filterNameId + "&sFilterVALUE=");

      var filters = filterData[filterName];
      filters.forEach(function(filter) {
        filterUrl += ("''" + filter.id.replace(/\&/g, '%26') + "'',");
      });
      filterUrl = filterUrl.substring(0, filterUrl.length - 1);

      return filterUrl;
      //      &sFilterNAME=FACT_NAME&sFilterVALUE=''南宁富桂精密工业有限公司''
    }

  },

  /**
   * KPI mapping
   * @param {String} data
   */
  addKPIFormatter: function(data) {
    var value = data;
    switch (data) {
      case "MMIN":
        value = oBundle.getText('MMIN_FULL_NAME');
        break;
      case "LAR":
        value = oBundle.getText('LAR_FULL_NAME');
        break;
      case "RIDPPM":
        value = oBundle.getText('RIDPPM_FULL_NAME');
        break;
      case "FDPPM":
        value = oBundle.getText('FDPPM_FULL_NAME');
        break;
      case "MMIN01":
        value = oBundle.getText('MMIN01_FULL_NAME');
        break;
      case "DPMO":
        value = oBundle.getText('DPMO_FULL_NAME');
        break;
      case "TPY":
        value = oBundle.getText('ADD_TPY_FULL_NAME');
        break;
      case "DDR":
        value = oBundle.getText('DDR_FULL_NAME');
        break;
      case "MMIN02":
        value = oBundle.getText('MMIN02_FULL_NAME');
        break;
      case "COM&CAR":
        value = oBundle.getText('COM&CAR_FULL_NAME');
        break;
      case "DFR":
        value = oBundle.getText('DFR_FULL_NAME');
        break;
      case "ERI":
        value = oBundle.getText('ERI_FULL_NAME');
        break;
      case "CCR":
        value = oBundle.getText('CCR_FULL_NAME');
        break;
      case "RST":
        value = oBundle.getText('RST_FULL_NAME');
        break;
      case "CCN":
        value = oBundle.getText('CCN_FULL_NAME');
        break;
      case "DPPM":
        value = oBundle.getText('DPPM_FULL_NAME');
        break;
      case "DOA&DAP":
        value = oBundle.getText('DOA&DAP_FULL_NAME');
        break;
      case "FFR":
        value = oBundle.getText('FFR_FULL_NAME');
        break;
      case "RSTR":
        value = oBundle.getText('RSTR_FULL_NAME');
        break;
      case "FPAR":
        value = oBundle.getText('FPAR_FULL_NAME');
        break;
      case "PPAR":
        value = oBundle.getText('PPAR_FULL_NAME');
        break;
      case "PPVR":
        value = oBundle.getText('PPVR_FULL_NAME');
        break;
      case "FQC":
        value = oBundle.getText('FQC_FULL_NAME');
        break;
      case "PQC":
        value = oBundle.getText('PQC_FULL_NAME');
        break;
      case "POR":
        value = oBundle.getText('POR_FULL_NAME');
        break;
      case "POQ":
        value = oBundle.getText('POQ_FULL_NAME');
        break;
      case "FPV":
        value = oBundle.getText('FPV_FULL_NAME');
        break;
      case "FOV":
        value = oBundle.getText('FOV_FULL_NAME');
        break;
      case "FCV":
        value = oBundle.getText('FCV_FULL_NAME');
        break;
      case "PPV":
        value = oBundle.getText('PPV_FULL_NAME');
        break;
      case "PRV":
        value = oBundle.getText('PRV_FULL_NAME');
        break;
      case "PIV":
        value = oBundle.getText('PIV_FULL_NAME');
        break;
      case "POO":
        value = oBundle.getText('POO_FULL_NAME');
        break;
      case "PCC":
        value = oBundle.getText('PCC_FULL_NAME');
        break;
      case "PCMR":
        value = oBundle.getText('PCMR_FULL_NAME');
        break;
      case "FCMR":
        value = oBundle.getText('FCMR_FULL_NAME');
        break;
      case "OFCMR":
        value = oBundle.getText('OFCMR_FULL_NAME');
        break;
      case "PCNR":
        value = oBundle.getText('PCNR_FULL_NAME');
        break;
      case "FCNR":
        value = oBundle.getText('FCNR_FULL_NAME');
        break;
      case "FCC":
        value = oBundle.getText('FCC_FULL_NAME');
        break;
      case "NCC":
        value = oBundle.getText('NCC_FULL_NAME');
        break;
      case "FSCMR":
        value = oBundle.getText('FSCMR_FULL_NAME');
        break;
      case "CMR1":
        value = oBundle.getText('CMR1_FULL_NAME');
        break;
      case "CMR2":
        value = oBundle.getText('CMR2_FULL_NAME');
        break;
      case "HPCC":
        value = oBundle.getText('HPCC_FULL_NAME');
        break;
      case "EPCC":
        value = oBundle.getText('EPCC_FULL_NAME');
        break;
      case "TPAR":
        value = oBundle.getText('TPAR_FULL_NAME');
        break;
      case "TPVR":
        value = oBundle.getText('TPVR_FULL_NAME');
        break;
      case "TQC":
        value = oBundle.getText('TQC_FULL_NAME');
        break;
      case "TOR":
        value = oBundle.getText('TOR_FULL_NAME');
        break;
      case "TOQ":
        value = oBundle.getText('TOQ_FULL_NAME');
        break;
      case "TEPD":
        value = oBundle.getText('TEPD_FULL_NAME');
        break;
      case "TPV":
        value = oBundle.getText('TPV_FULL_NAME');
        break;
      case "TOV":
        value = oBundle.getText('TOV_FULL_NAME');
        break;
      case "TIV":
        value = oBundle.getText('TIV_FULL_NAME');
        break;
      case "TCV":
        value = oBundle.getText('TCV_FULL_NAME');
        break;
      case "TCC":
        value = oBundle.getText('TCC_FULL_NAME');
        break;
      case "TCMR":
        value = oBundle.getText('TCMR_FULL_NAME');
        break;
      case "HTCC":
        value = oBundle.getText('HTCC_FULL_NAME');
        break;
      case "ETCC":
        value = oBundle.getText('ETCC_FULL_NAME');
        break;
      case "HTCMR":
        value = oBundle.getText('HTCMR_FULL_NAME');
        break;
      case "ETCMR":
        value = oBundle.getText('ETCMR_FULL_NAME');
        break;
      case "TPI":
        value = oBundle.getText('TPI_FULL_NAME');
        break;
      case "CDDC":
        value = oBundle.getText('CDDC_FULL_NAME');
        break;
      case "PCM":
        value = oBundle.getText('PCM_FULL_NAME');
        break;
      case "LTWIP":
        value = oBundle.getText('LTWIP_FULL_NAME');
        break;
      case "ECOST":
        value = oBundle.getText('ECOST_FULL_NAME');
        break;
      case "MEC":
        value = oBundle.getText('MEC_FULL_NAME');
        break;
      case "FS":
        value = oBundle.getText('FS_FULL_NAME');
        break;
      case "KPI&ALARM":
        value = oBundle.getText('KPI&ALARM_FULL_NAME');
        break;
    }
    return value;
  },

  /**
   * Gantt formatter for gantt chart data
   * @param  {Object} data
   * @return {String}
   */
  ganttFormattor: function(data) {
    var value = data;
    switch (data) {
      case 'Overall Process':
        value = sap.oBundle.getText('LeadTimeOverallProcess');
        break;
      case 'Overall':
        value = sap.oBundle.getText('Overall');
        break;
    }
    return value;
  }

};
