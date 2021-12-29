//ShipExecTrack.js
//Written by Alex Spear
//
//The purpose of this script is it to be used with ShipExec, specifically the shipping webpage.
//When loaded, it adds 2 main functions: Counting, and Auto-Shipping.
//User can enter their username to tie Ship Counts to them.
//Counts are automatically sent to a Google Sheet and tied to the username.
//Autoship option can be toggled to auto-ship after loading an RX label.
//Autoshipping will not work if a Username has not been entered.

shExTrInit();

//Main Init function.
function shExTrInit(){
	shExTrVersion = "1.7.1";
	shExTrShExVersion = "1.12.17069.1";
	shExTrGoogleSheetURL = 'https://script.google.com/macros/s/AKfycbzo1AUyBmZCdzEPbSIvkvvaMWDETwNvTRfNLweiC0s1CCo-RywIT8ul3zlAF3NpXYQ51w/exec';
	shExTrAllowedUrlPaths = ['/ShipExec/Content/RateShip/Manifest.aspx'];
	
	shExTrStationName = "shipexec_gl";
	shExTrLocationName = "";

	shExTrPreviousWebRequest = {"url":"", "data": "", "loadCallback": 0};

	shExTrHasRefreshedCounts = false;
	
	//Check the URL to see if it is the ShipExec shipping page.
	if (typeof shExTrDebugMode === 'undefined'){
		let match = false;
		for (let i = 0; i < shExTrAllowedUrlPaths.length; i++){
			if (window.location.href.indexOf(shExTrAllowedUrlPaths[i]) > -1){
				match = true;
				break;
			}
		}
		if (!match){
			console.log('Script on wrong page. Aborting load.');
			alert("This isn't the correct page to use ShipExecTrack on!")
			return;
		}
	}
	
	if (typeof shExTrIsLoggedIn != 'undefined'){
		console.log('Script is likely already loaded, aborting load.');
		return;
	}
	
	//Initialize some global variables which will remain for the duration of the page lifetime.
	shExTrDoAutoship = true;
	
	shExTrIsLoggedIn = false;
	shExTrLoginToken = '';
	shExTrLoginName = 'no_user';
	
	shExTrLastShipTime = new Date();
	shExTrShipLengthsArr = new Array();
	
	shExTrPersonalData = new Array();
	shEvTrCountsTableShown = true;
	
	shExTrValidUsernames = new Array();
	shExTrLoadingUsernames = true;
	
	shExTrUnsentCounts = new Array();
	
	shExTrPostRequest = null;
	
	shExTrCountsBeingRequested = false;

	shExTrScannedBarcode = "";
	shExTrScannedBarcodeShippedPrevious = "";
	
	//Has a shipment been done since the log in has changed
	shExTrHasShippedSinceLogIn = false;
	
	//Used for when the mule server is unreachable, will be appended next successful connection
	shExTrShipCountUnlogged = 0;

	//-----Main Toolbar Section-----

	//Create Autoship Button
	shExTrAutoButton = document.createElement('a');
	shExTrAutoButton.className = 'ButtonColorGroup';
	shExTrAutoButton.style.marginLeft = '5px';
	shExTrAutoButton.appendChild(document.createTextNode('Autoship ON'));
	
	//Create View Counts Button
	shExTrCountsButton = document.createElement('a');
	shExTrCountsButton.className = 'ButtonColorGroup';
	shExTrCountsButton.style.marginLeft = '5px';
	shExTrCountsButton.appendChild(document.createTextNode('Hide Counts'));
	
	//Create Login Button
	shExTrLoginButton = document.createElement('a');
	shExTrLoginButton.className = 'ButtonColorGroup';
	shExTrLoginButton.style.marginLeft = '5px';
	shExTrLoginButton.appendChild(document.createTextNode('Login'));
	
	//Create Logout Button
	shExTrLogoutButton = document.createElement('a');
	shExTrLogoutButton.className = 'ButtonColorGroup';
	shExTrLogoutButton.style.marginLeft = '5px';
	shExTrLogoutButton.appendChild(document.createTextNode('Logout'));
	
	//Create Refresh Counts Button
	shExTrRefreshCountsButton = document.createElement('a');
	shExTrRefreshCountsButton.className = 'ButtonColorGroup';
	shExTrRefreshCountsButton.style.marginBottom = '20px';
	shExTrRefreshCountsButton.style.marginLeft = '20px';
	shExTrRefreshCountsButton.style.fontSize = '12px';
	shExTrRefreshCountsButton.appendChild(document.createTextNode('Refresh Counts'));
	shExTrRefreshCountsButton.addEventListener('click',shExTrOnButtonRefreshCountsClick);
	
	//Create Username Label
	shExTrUserLabel = document.createElement('span');
	shExTrUserLabel.style.marginLeft = '5px';
	shExTrUserLabel.appendChild(document.createTextNode('Username:'));
	
	//Create Password Label
	shExTrPassLabel = document.createElement('span');
	shExTrPassLabel.style.marginLeft = '5px';
	shExTrPassLabel.appendChild(document.createTextNode('Password:'));
	
	//Create Logged In Label
	shExTrLoggedInLabel = document.createElement('span');
	shExTrLoggedInLabel.style.marginLeft = '5px';
	shExTrLoggedInLabel.appendChild(document.createTextNode('Logged in as: '));
	
	//Create Not Logged In Label
	shExTrNotLoggedInLabel = document.createElement('span');
	shExTrNotLoggedInLabel.style.marginLeft = '5px';
	shExTrNotLoggedInLabel.style.color = 'red';
	shExTrNotLoggedInLabel.appendChild(document.createTextNode('Not logged in for tracking!'));
	
	//Create Username Input Field
	shExTrInputUser = document.createElement('input');
	shExTrInputUser.style.marginLeft = '5px';
	
	//Create Password Input Field
	shExTrInputPass = document.createElement('input');
	shExTrInputPass.type = 'password';
	shExTrInputPass.style.marginLeft = '5px';
	
	//Create the Counts Table
	shExTrTable = document.createElement('table');
	shExTrTableCaption = document.createElement('caption');
	shExTrTableCaption.innerHTML = "Daily Ship Counts.";
	shExTrTableCaption.style.margin = "5px";
	shExTrTableCaption.style.captionSide = "bottom";
	shExTrTable.appendChild(shExTrTableCaption);
	shExTrTable.style.display = 'table';
	shExTrTable.style.backgroundColor = 'black';
	shExTrTable.style.borderStyle = 'ridge';
	shExTrTable.style.borderWidth = '5px';
	shExTrTable.style.margin = '10px';
	shExTrTable.style.padding = '5px';
	shExTrTable.style.fontSize = '12px';
	shExTrTable.style.textAlign = 'center';
	shExTrTableRows = new Array(26);
	for (let i = 0; i < 26; ++i){
		shExTrTableRows[i] = document.createElement('tr');
		shExTrTable.appendChild(shExTrTableRows[i]);
	}
	for (let i = 1; i < 25; ++i){
		shExTrTableRows[i].style.display = 'none';
	}
	shExTrTableCells = new Array(1);
	shExTrTableCells[0] = new Array(26);
	for (let i = 0; i < 26; ++i){
		var cell = document.createElement('th');
		cell.style.padding = '5px';
		shExTrTableCellCSSNormal(cell);
		shExTrTableRows[i].appendChild(cell);
		shExTrTableCells[0][i] = cell;
		if (i == 0) cell.innerHTML = "User";
		else if (i < 12) cell.innerHTML = (-i + 12) + " PM";
		else if (i == 12) cell.innerHTML = "12 PM";
		else if (i < 24) cell.innerHTML = (-i + 24) + " AM";
		else if (i == 24) cell.innerHTML = "12 AM";
		else{
			cell.innerHTML = "Totals";
			shExTrTableCellCSSTotal(cell);
		}
	}
	////Create Date Picker Label
	//shExTrLabelDatePicker = document.createElement('label');
	//shExTrLabelDatePicker.style.margin = '5px';
	//shExTrLabelDatePicker.innerHTML = "Pick date (mm-dd-yy): ";
	//
	////Create Date Input field for table
	//shExTrInputDateTable = document.createElement('input');
	//shExTrInputDateTable.type = 'text';
	//shExTrInputDateTable.pattern = '[0-1]+[1-9]+-[0-3]+[0-9]+-[0-9]{2}';
	//shExTrInputDateTable.style.margin = '5px';
	
	//Find the bottom toolbar, where the new fields will be added
	tableShippingClient = document.getElementById('ctl00_cphContent_shipping_client_tbl');
	tableFormModules = tableShippingClient.getElementsByClassName('FormModule');
	buttonBarElements = tableFormModules[0].getElementsByClassName('ButtonBar');
	bottomButtonBarElement = buttonBarElements[buttonBarElements.length - 1];
	
	//Add new elements to the Toolbar
	bottomButtonBarElement.insertBefore(shExTrAutoButton, bottomButtonBarElement.childNodes[0]);
	bottomButtonBarElement.insertBefore(shExTrCountsButton, bottomButtonBarElement.childNodes[0]);
	bottomButtonBarElement.insertBefore(shExTrLogoutButton, bottomButtonBarElement.childNodes[0]);
	bottomButtonBarElement.insertBefore(shExTrLoggedInLabel, bottomButtonBarElement.childNodes[0]);
	bottomButtonBarElement.insertBefore(shExTrLoginButton, bottomButtonBarElement.childNodes[0]);
	//bottomButtonBarElement.insertBefore(shExTrInputPass, bottomButtonBarElement.childNodes[0]);
	//bottomButtonBarElement.insertBefore(shExTrPassLabel, bottomButtonBarElement.childNodes[0]);
	bottomButtonBarElement.insertBefore(shExTrInputUser, bottomButtonBarElement.childNodes[0]);
	bottomButtonBarElement.insertBefore(shExTrUserLabel, bottomButtonBarElement.childNodes[0]);
	bottomButtonBarElement.insertBefore(shExTrNotLoggedInLabel, bottomButtonBarElement.childNodes[0]);
	
	//-----Metrics display section-----
	
	//Create metrics label
	shExTrMetricsLabel = document.createElement('span');
	shExTrMetricsLabelText1 = document.createTextNode('');
	shExTrMetricsLabelText2 = document.createTextNode('');
	shExTrMetricsLabelText3 = document.createTextNode('');
	shExTrMetricsLabelText4 = document.createTextNode('');
	shExTrMetricsLabel.appendChild(shExTrMetricsLabelText1);
	shExTrMetricsLabel.appendChild(document.createElement('br'));
	shExTrMetricsLabel.appendChild(shExTrMetricsLabelText2);
	shExTrMetricsLabel.appendChild(document.createElement('br'));
	shExTrMetricsLabel.appendChild(shExTrMetricsLabelText3);
	shExTrMetricsLabel.appendChild(document.createElement('br'));
	shExTrMetricsLabel.appendChild(shExTrMetricsLabelText4);
	
	//Create New Container Div for Footer
	shExTrFooterDiv = document.createElement('div');
	shExTrFooterDiv.style.display = 'flex';
	
	//Create New Container Div for new Right-Side Footer
	shExTrFooterRightDiv = document.createElement('div');
	shExTrFooterRightDiv.style.marginLeft = 'auto';
	shExTrFooterRightDiv.style.marginRight = '20px';
	
	//Find the footer div
	shExMastFoot = document.getElementById('ctl00_upsFooter');
	
	//find the div which holds the main divs of the page, EI. the parent of the Footer
	shExGroupDiv = shExMastFoot.parentNode;
	
	//-----Ship Exec Track Signature Footer-----
	shExTrSignFooterDiv = document.createElement('div');
	shExTrSignFooterDiv.className = 'Version';
	shExTrSignFooterSpan = document.createElement('span');
	shExTrSignFooterSpan.innerHTML = "ShipExecTrack Version: " + shExTrVersion + " for ShipExec Web Client Version " + shExTrShExVersion;
	shExTrSignFooterDiv.appendChild(shExTrSignFooterSpan);
	
	//Restructure footer with new div
	shExGroupDiv.removeChild(shExMastFoot);
	shExGroupDiv.appendChild(shExTrFooterDiv);
	shExTrFooterDiv.appendChild(shExMastFoot);
	shExMastFoot.insertBefore(shExTrRefreshCountsButton, shExMastFoot.childNodes[0]);
	shExMastFoot.insertBefore(shExTrTable, shExMastFoot.childNodes[0]);
	//shExMastFoot.insertBefore(shExTrInputDateTable, shExMastFoot.childNodes[0]);
	//shExMastFoot.insertBefore(shExTrLabelDatePicker, shExMastFoot.childNodes[0]);
	shExMastFoot.appendChild(shExTrSignFooterDiv);
	shExTrFooterDiv.appendChild(shExTrFooterRightDiv);
	shExTrFooterRightDiv.appendChild(shExTrMetricsLabel);
	
	//-----Autoship and Count functionality section-----
	
	//Find Ship Button
	shipButton = document.getElementById('ctl00_cphContent_ship_btn');
	//Find Status Label
	statusLabel = document.getElementById('ctl00_cphContent_status_lbl');
	//Find Status Label
	shExloadInputElement = document.getElementById('ctl00_cphContent_load_ctrl_load_txt');
	//Find Load Button
	shExloadButtonElement = document.getElementById('ctl00_cphContent_load_btn');
	//Find Load Text Input Field
	shExloadInputElement = document.getElementById('ctl00_cphContent_load_ctrl_load_txt');
	
	//Add event to Autoship Button for toggling
	shExTrAutoButton.addEventListener('click',shExTrOnButtonAutoClick);
	
	//Add event to View Counts Button for toggling
	shExTrCountsButton.addEventListener('click',shExTrOnButtonViewCountsClick);
	
	//Add event to login button
	shExTrLoginButton.addEventListener('click',shExTrOnButtonLoginClick);
	
	//Add event to logout button
	shExTrLogoutButton.addEventListener('click',shExTrOnButtonLogoutClick);
	
	//Add event for pressing enter in username input field
	shExTrInputUser.addEventListener("keyup", shExTrOnInputUsernameKeyUp);
	
	//Add event for change in load input field
	shExloadInputElement.addEventListener("change", shExTrOnInputLoadChange);
	
	//Load cookies for login status if present.
	shExTrLoginToken = shExTrGetCookie('ShExTrToken');
	shExTrLoginName = shExTrGetCookie('ShExTrName');
	if (shExTrLoginToken != ''){
		//TODO: check if login is still valid with server
		shExTrIsLoggedIn = true;
	}
	
	//Update logged-in state appropriatly if log in was found or not.
	if (shExTrIsLoggedIn) shExTrSetVisualAsLoggedIn();
	else shExTrSetVisualAsLoggedOut();
	
	//Load data from cookies.
	shExTrLoadUnsentCounts();
	shExTrPersonalDataLoadAll();
	
	//Start timer of posting the counts
	window.setInterval(shExTrDoCountsPost,10*60*1000);
	//Do a post in 5 seconds
	window.setTimeout(shExTrDoCountsPost,5*1000);
	
	//Request counts and names from Google Sheet initially. If location is unknown, just load names.
	shExTrLoadLocation();
	if (shExTrLocationName != "") shExTrRequestCountsAndNames();
	else shExTrLoadValidUsernames();
	
	//Override the loadSuccess function used by ShipExec.
	loadSuccess = shExLoadSuccess;
	
	//Override the shipSuccess function used by ShipExec.
	shipSuccess = shExShipSuccess;
	
	//If logged in, focus the load button. Otherwise focus the username button.
	if (shExTrIsLoggedIn) shExloadButtonElement.click();
	else{
		if (document.getElementById('ctl00_cphContent_load_panel').style.display != 'none') document.getElementById('ctl00_cphContent_load_cancel_btn').click();
		shExTrInputUser.focus();
	}
	
	if (typeof shExTrDebugMode !== 'undefined'){
		//Create Debug Ship Button
		shExTrDebugButton = document.createElement('a');
		shExTrDebugButton.className = 'ButtonColorGroup';
		shExTrDebugButton.style.marginLeft = '5px';
		shExTrDebugButton.appendChild(document.createTextNode('Debug Ship'));
		bottomButtonBarElement.insertBefore(shExTrDebugButton, bottomButtonBarElement.childNodes[0]);
		shExTrDebugButton.addEventListener('click',shExTrOnSuccessfulShip);
		
		//Create Post Counts Button
		shExTrPostCountsButton = document.createElement('a');
		shExTrPostCountsButton.className = 'ButtonColorGroup';
		shExTrPostCountsButton.style.marginLeft = '5px';
		shExTrPostCountsButton.appendChild(document.createTextNode('Post Counts'));
		bottomButtonBarElement.insertBefore(shExTrPostCountsButton, bottomButtonBarElement.childNodes[0]);
		shExTrPostCountsButton.addEventListener('click',shExTrDoCountsPost);
	}

}

//#region ShipExec Override Functions
//Overridden callback function when ShipExec ships something.
//The purpose of this is to only perform our code after a successful or failed ship, which can only be
//reliably detected from inside this function.
//This is a direct copy-paste of the built-in ShipExec function.
//If ShipExec updates this function at any point, this script will also need to be updated.
//Counting code is inserted at the end of the function, before the Catch statement.
//Reloading code is inserted after an error portion of the function.
function shExShipSuccess(result){
	var ctrl;
	try {
		if (use_postShipBO)
			try {
				typeof postShipBO == 'function' && postShipBO(sox_current_shipment, result);
			}
			catch (e) {
				throw Error(e.description);
			}
		sox_last_ship_resp = result;
		sox_last_ship_req = Ups.Ajax.deepCopyObject(null, sox_current_shipment);
		if (result != null && result.packages.length > 0)
			for (var pkgindex = 0; pkgindex < sox_last_ship_resp.packages.length; pkgindex++)
				for (var docindex = 0; docindex < sox_last_ship_resp.packages[pkgindex].documents.length; docindex++) {
					var currentdoc = sox_last_ship_resp.packages[pkgindex].documents[docindex];
					(ship_mode == 0 || ship_mode == 1 && (currentdoc.doc_type == 1 || currentdoc.doc_type == 4)) && runPrintSoxDocument(currentdoc, printSuccessHandler, printExceptionHandler);
				}
		if (result.def_attr.error_code != 0) {
			var errorMessage = result.def_attr.error_message + ' [' + result.def_attr.error_code + ']:  ';
			for (i = 0; i < result.def_attr.errors.length; i++)
				errorMessage += result.def_attr.errors[i].error_message + '.  ';
			$('#' + progress_img_id).css('display', 'none');
			$('#' + status_lbl_id).text(errorMessage).css('color', 'red');
			
			//-----Begin Reload Block-----
			if (errorMessage == 'Package #1: Weight is less than minimum [1001]:  '){
				//Auto press load button again weight less than mininum error.
				shExloadButtonElement.click();
			}
			//------End Reload Block------
			
			return;
		}
		$('#' + progress_img_id).css('display', 'none');
		$('#' + status_lbl_id).text('Last Shipment Successful').css('color', 'green');
		if (ship_mode == 1 && ship_indv_total_packages > 1) {
			ship_indv_request.def_attr = sox_last_ship_req.def_attr;
			ship_indv_request.packages.push(sox_last_ship_req.packages[0]);
			ship_indv_global_msns.push(new Object(sox_last_ship_resp.packages[0].global_msn));
			ship_indv_response.packages.push(sox_last_ship_resp.packages[0]);
			if (ship_indv_current_idx == 0)
				ship_indv_response.def_attr = sox_last_ship_resp.def_attr;
			else {
				ship_indv_response.def_attr.base_charge += sox_last_ship_resp.def_attr.base_charge;
				ship_indv_response.def_attr.discount += sox_last_ship_resp.def_attr.discount;
				ship_indv_response.def_attr.special += sox_last_ship_resp.def_attr.special;
				ship_indv_response.def_attr.total += sox_last_ship_resp.def_attr.total;
			}
			if (ship_indv_current_idx == ship_indv_total_packages - 1) {
				var carrier = getCarrierFromLastShipment(sox_last_ship_resp);
				if (carrier != null && (carrier.indexOf('CONNECTSHIP') == 0 || carrier.indexOf('TANDATA') == 0))
					SoxOnWcfDblHop.ReProcess(carrier, ship_indv_global_msns, reProcessSuccess, reProcessFailure);
				else {
					sox_last_ship_req = ship_indv_request;
					sox_last_ship_resp = ship_indv_response;
					typeof LastShipment_setLastShipment == 'function' && LastShipment_setLastShipment(sox_last_ship_req, sox_last_ship_resp, last_shipment_ctrl_id);
					newShipment();
				}
			}
			else {
				ship_indv_current_idx++;
				updatePackageCounter();
				sox_current_shipment.packages[0] = {};
				setControlsFromSoxShipment(sox_current_shipment);
				if (use_addPackageBO)
					try {
						typeof addPackageBO == 'function' && addPackageBO(sox_current_shipment, sox_current_package_idx);
					}
					catch (e) {
						$('#' + status_lbl_id).text(e.description).css('color', 'red');
		console.log('catch 2');
						return;
					}
				typeof LastShipment_setLastShipment == 'function' && LastShipment_setLastShipment(sox_last_ship_req, ship_indv_response, last_shipment_ctrl_id);
			}
		}
		else {
			typeof LastShipment_setLastShipment == 'function' && LastShipment_setLastShipment(sox_last_ship_req, sox_last_ship_resp, last_shipment_ctrl_id);
			var urlParams = Ups.Ajax.getUrlParams();
			if (urlParams.batch_reference != null && urlParams.batch_item_reference != null)
				window.location = document.referrer + '#?batch_reference=' + urlParams.batch_reference;
			newShipment();
		}
		//-----Begin Counting Block-----
		shExTrOnSuccessfulShip();
		//------End Counting Block------
	}
	catch (e) {
		$('#' + progress_img_id).css('display', 'none');
		$('#' + status_lbl_id).text(e.description).css('color', 'red');
		console.log('catch 3');
	}
}

//Overridden callback function when ShipExec loads something.
//The purpose of this is to only perform our code after a successful load or failed load, which can only be
//reliably detected from inside this function.
//This is a direct copy-paste of the built-in ShipExec function.
//If ShipExec updates this function at any point, this script will also need to be updated.
//Auto-shipping code is inserted at the end of the function, before the Catch statement.
//Reloading code is inserted at an error portion of the function.
function shExLoadSuccess(result){
	var load_value = Load_getControlValue();
	$('#' + progress_img_id).css('display', 'none');
	if (result == null)
		$('#' + status_lbl_id).text('Load Successful but no Shipment found for load operation.').css('color', 'green');
	else
		try {
			if (result.def_attr.error_code != 0) {
				var errorMessage = result.def_attr.error_message + ' [' + result.def_attr.error_code + ']:  ';
				for (i = 0; i < result.def_attr.errors.length; i++)
					errorMessage += result.def_attr.errors[i].error_message + '.  ';
				$('#' + progress_img_id).css('display', 'none');
				$('#' + status_lbl_id).text(errorMessage).css('color', 'red');
				
				//-----Begin Auto-Reload Block-----
				//Auto press load button again after a failed load.
				shExloadButtonElement.click();
				//------End Auto-Reload Block------
				
				return;
			}
			sox_current_shipment = result;
			Ups.Ajax.removeExtensionData(sox_current_shipment);
			sox_current_shipment = Ups.Ajax.cleanObject(sox_current_shipment);
			sox_current_package_idx = 0;
			setControlsFromSoxShipment(sox_current_shipment);
			updatePackageCounter();
			$('#' + status_lbl_id).text('Load Successful').css('color', 'green');
			if (use_postLoadBO)
				try {
					typeof postLoadBO == 'function' && postLoadBO(load_value, sox_current_shipment);
				}
				catch (e) {
					$('#' + status_lbl_id).text(e.description).css('color', 'red');
				}
			//-----Begin Auto-Ship Block-----
			//Check if Auto-Shipping is turned on
			if (shExTrDoAutoship == true){
				//Check if user is logged in
				if (shExTrIsLoggedIn == true){
					console.log('Autoshipping...');
					//Click the Ship button in 0.3 seconds.
					//Delay is for possible network leniancy.
					setTimeout(function(){
						shipButton.click();
					},300);
				}
				else{
					$('#' + status_lbl_id).text("Load Successful. Please enter your username to autoship.").css('color', 'red');
				}
			}
			//------End Auto-Ship Block------
		}
		catch (e) {
			$('#' + status_lbl_id).text(e.description).css('color', 'red');
		}
	sox_current_shipment.def_attr.transactionId = Ups.Ajax.generateUUID();
}
//#endregion

//Function for Updating elements after logging in.
function shExTrSetVisualAsLoggedIn(){
	shExTrLogoutButton.style.display = 'inline';
	shExTrLoggedInLabel.style.display = 'inline';
	shExTrLoginButton.style.display = 'none';
	shExTrInputPass.style.display = 'none';
	shExTrPassLabel.style.display = 'none';
	shExTrInputUser.style.display = 'none';
	shExTrUserLabel.style.display = 'none';
	shExTrNotLoggedInLabel.style.display = 'none';
	shExTrLoggedInLabel.innerHTML = 'Logged in as: ' + shExTrLoginName;
}
	
//Function for Updating elements after logging out.
function shExTrSetVisualAsLoggedOut(){
	shExTrLogoutButton.style.display = 'none';
	shExTrLoggedInLabel.style.display = 'none';
	shExTrLoginButton.style.display = 'inline';
	shExTrInputPass.style.display = 'inline';
	shExTrPassLabel.style.display = 'inline';
	shExTrInputUser.style.display = 'inline';
	shExTrUserLabel.style.display = 'inline';
	shExTrNotLoggedInLabel.style.display = 'inline';
}

//Function for focusing the load field or the username field depending on login status.
function shExTrFocusLoadOrUser(){
	if (shExTrIsLoggedIn){
		shExloadButtonElement.click();
	}
	else{
		if (document.getElementById('ctl00_cphContent_load_panel').style.display != 'none') document.getElementById('ctl00_cphContent_load_cancel_btn').click();
		shExTrInputUser.focus();
	}
}

//Function to add 1 to the unsent count at the current time for the current user
function shExTrAddUnsentCount(){
	if (!shExTrIsLoggedIn) return;
	const d = new Date();
	let match = -1;
	//Skip 1st entry in list if it is being posted. May result in duplicate, but that's ok.
	for (var i = 0; i < shExTrUnsentCounts.length; i++){
		if (shExTrUnsentCounts[i].username != shExTrLoginName) continue;
		if (shExTrUnsentCounts[i].day != d.getDate()) continue;
		if (shExTrUnsentCounts[i].month != d.getMonth() + 1) continue;
		if (shExTrUnsentCounts[i].year != d.getYear() + 1900) continue;
		match = i;
		break;
	}
	if (match == -1){
		//Create new Unsent Count entry
		var thisCount = new UnsentCountsObject();
		thisCount.username = shExTrLoginName;
		thisCount.day = d.getDate();
		thisCount.month = d.getMonth() + 1;
		thisCount.year = d.getYear() + 1900;
		shExTrUnsentCounts.push(thisCount);
		match = shExTrUnsentCounts.length - 1;
	}
	//Append to existing Unsent Count Entry
	switch (d.getHours()){
		case 0:
			shExTrUnsentCounts[match].h0++;
			break;
		case 1:
			shExTrUnsentCounts[match].h1++;
			break;    
		case 2:       
			shExTrUnsentCounts[match].h2++;
			break;    
		case 3:       
			shExTrUnsentCounts[match].h3++;
			break;    
		case 4:       
			shExTrUnsentCounts[match].h4++;
			break;    
		case 5:       
			shExTrUnsentCounts[match].h5++;
			break;    
		case 6:       
			shExTrUnsentCounts[match].h6++;
			break;    
		case 7:       
			shExTrUnsentCounts[match].h7++;
			break;    
		case 8:       
			shExTrUnsentCounts[match].h8++;
			break;    
		case 9:       
			shExTrUnsentCounts[match].h9++;
			break;    
		case 10:      
			shExTrUnsentCounts[match].h10++;
			break;    
		case 11:      
			shExTrUnsentCounts[match].h11++;
			break;    
		case 12:      
			shExTrUnsentCounts[match].h12++;
			break;    
		case 13:      
			shExTrUnsentCounts[match].h13++;
			break;    
		case 14:      
			shExTrUnsentCounts[match].h14++;
			break;    
		case 15:      
			shExTrUnsentCounts[match].h15++;
			break;    
		case 16:      
			shExTrUnsentCounts[match].h16++;
			break;    
		case 17:      
			shExTrUnsentCounts[match].h17++;
			break;    
		case 18:      
			shExTrUnsentCounts[match].h18++;
			break;    
		case 19:      
			shExTrUnsentCounts[match].h19++;
			break;    
		case 20:      
			shExTrUnsentCounts[match].h20++;
			break;    
		case 21:      
			shExTrUnsentCounts[match].h21++;
			break;    
		case 22:      
			shExTrUnsentCounts[match].h22++;
			break;    
		case 23:      
			shExTrUnsentCounts[match].h23++;
			break;
	}
	if (shExTrScannedBarcode != shExTrScannedBarcodeShippedPrevious){
		shExTrScannedBarcodeShippedPrevious = shExTrScannedBarcode;
		shExTrUnsentCounts[match].lpns += shExTrScannedBarcode + '+';
	}
}

//Function called after doing a successful ship
function shExTrOnSuccessfulShip() {
	//Get the current date and time.
	let d = new Date();
	
	//If the last shipment happened in a different day than now.
	if (d.getDate() != shExTrLastShipTime.getDate()){
		shExTrHasShippedSinceLogIn = false;
		shExTrShipLengthsArr.length = 0;
		shExTrPersonalDataResetHour();
	}
	//If the last shipment happened in a different hour than now.
	if (d.getHours() != shExTrLastShipTime.getHours()){
		shExTrPersonalDataResetHour();
	}
	
	//If there was a previous shipment done since logging in
	if (shExTrHasShippedSinceLogIn == true){
		let timeDif = (d.getTime() - shExTrLastShipTime.getTime()) / 1000;
		//If the time dif is more than 5 minutes, just reset it.
		if (timeDif > 300){
			shExTrShipLengthsArr.length = 0;
		}
		else{
			//Record the time difference between this ship and the last in the average list.
			shExTrShipLengthsArr.push(timeDif);
			//If the list is longer than the desired average count length, remove the oldest one.
			if (shExTrShipLengthsArr.length > 10) shExTrShipLengthsArr.shift();
		}
	}
	shExTrHasShippedSinceLogIn = true;
	
	//Update the last ship time to now.
	shExTrLastShipTime = d;
	let thisHour = d.getHours();
	
	//Update Counts
	shExTrPersonalDataAddCount();
	shExTrAddUnsentCount();//Add an unsent count, which will be sent to Google Sheets later.
	
	//Update the metrics label text.
	shExTrUpdateMetricsLabel();
	
	//Save count cookies.
	shExTrSaveUnsentCounts();
	shExTrPersonalDataSaveAll();
}

//Function for creating a post request from unsent count data.
function shExTrCreateNewPostRequest(){
	if (shExTrUnsentCounts.length <= 0){
		console.log("No counts to post.");
		return false;
	}
	
	shExTrPostRequest = {"postType":"PostCounts","entries":[],"postID":(Math.floor(Math.random() * 16777216)),"postTime":(Date.now())};
	
	for (let i = 0; i < shExTrUnsentCounts.length; i++){
		shExTrPostRequest.entries.push(shExTrUnsentCounts[i]);
	}
	
	shExTrUnsentCounts.length = 0;
	shExTrSaveUnsentCounts();
	shExTrSavePostRequest();
	
	return true;
}

//Main function to post counts to Google Sheet.
function shExTrDoCountsPost(){
	if (shExTrPostRequest != null){
		shExTrSendPostRequest();
		return;
	}
	if (shExTrCreateNewPostRequest()) shExTrSendPostRequest();
}

//#region Metrics
//Function for getting the average from an array
function shExTrGetArrayAverage(a) {
	if (a.length <= 0) return 0;
	var sum = 0;
	a.forEach(function(item, index, array) {
		sum += item;
	})
	sum /= a.length;
	return sum;
}

//Function for updating the metrics label.
function shExTrUpdateMetricsLabel(){
	let personal = shExTrPersonalDataFindActive();
	if (personal == null) return;
	
	shExTrMetricsLabelText1.nodeValue = "Shipped this hour: " + personal.hourCount;
	
	let avgCount = shExTrGetArrayAverage(shExTrShipLengthsArr);
	if (avgCount != 0){
		avgCount = (60 / avgCount);
		avgCount = Math.round(avgCount*10) / 10;
		if ((avgCount % 1) == 0) avgCount = avgCount + ".0";
		shExTrMetricsLabelText2.nodeValue = "Average per minute (last 10): " + avgCount;
	}
	else shExTrMetricsLabelText2.nodeValue = "";
	
	if (personal.countSinceLogin > 0){
		//Calculate shipping speed and hourly projection
		//Figure out related Date Times
		let minutesSinceLogin = (Date.now() -  personal.loginTick) / 60000;
		let nextHour = new Date(Date.now() + 1000*60*60);
		nextHour.setMinutes(0);
		nextHour.setSeconds(0);
		nextHour.setMilliseconds(0);
		let minutesUntilNextHour = (nextHour.getTime() - Date.now()) / 60000;

		let avgCountOverHour = personal.countSinceLogin / minutesSinceLogin;
		let hourProjectionNum = Math.round(personal.hourCount + (minutesUntilNextHour * avgCountOverHour));

		avgCountOverHour = Math.round(avgCountOverHour*10) / 10;
		if ((avgCountOverHour % 1) == 0) avgCountOverHour = avgCountOverHour + ".0";
		shExTrMetricsLabelText3.nodeValue = "Average per minute (this hour): " + avgCountOverHour;

		shExTrMetricsLabelText4.nodeValue = "Hour Projection: " + hourProjectionNum;
	}
	else {
		shExTrMetricsLabelText3.nodeValue = "";
		shExTrMetricsLabelText4.nodeValue = "";
	}
}
//#endregion

//#region Table
//Function for building the table with all users.
function shExTrBuildTable(data) {
	shExTrClearTable();
	
	//Verify data is valid
	if (data == 0) data = new Array(0);
	
	//Collapse similar username columns into a single column.
	shExTrCollapseDataByUsername(data);
	
	//Make new columns if needed
	for (let i = shExTrTableCells.length; i < data.length + 2; ++i){
		shExTrTableCells.push(new Array(26));
		shExTrTableCells[i][0] = document.createElement('th');
		shExTrTableRows[0].appendChild(shExTrTableCells[i][0]);
		for (let j = 1; j < 26; ++j){
			shExTrTableCells[i][j] = document.createElement('td');
			shExTrTableRows[j].appendChild(shExTrTableCells[i][j]);
		}
		//Cell CSS
		for (let j = 0; j < 26; ++j){
			shExTrTableCells[i][j].style.padding = '5px';
		}
	}
	
	//Totals variables
	let userTotals = new Array(data.length);
	for (let i = 0; i < data.length; i++) {userTotals[i] = 0;}
	let timeTotals = new Array(25);
	for (let i = 0; i < 25; i++) {timeTotals[i] = 0;}
	
	//Itterate through cells and data
	for (let i = 1; i < data.length + 1; ++i){
		//Cell data.
		shExTrTableCells[i][0].innerHTML = data[i-1].username;
		for (let j = 1; j < 26; ++j){
			let tc = 0;
			if (j <= 24){
				tc = data[i-1]['h' + (-j + 24)];
			}
			else{
				tc = userTotals[i-1];
			}
			if (tc != undefined) if (tc > 0){
				shExTrTableCells[i][j].innerHTML = tc;
				if (j < 25) userTotals[i-1] += tc;
				timeTotals[j-1] += tc;
			}
		}
		//Cell CSS.
		shExTrTableCellCSSNormal(shExTrTableCells[i][0]);
		for (let j = 1; j < 25; ++j){
			shExTrTableCellCSSNormal(shExTrTableCells[i][j]);
		}
		shExTrTableCellCSSTotal(shExTrTableCells[i][25]);
	}
	let TCI = data.length + 1; //Totals Column Index
	//Cell data.
	shExTrTableCells[TCI][0].innerHTML = "Totals";
	for (let j = 1; j < 26; ++j){
		shExTrTableCells[TCI][j].innerHTML = timeTotals[j-1];
	}
	//Cell CSS.
	for (let j = 0; j < 25; ++j){
		shExTrTableCellCSSTotal(shExTrTableCells[TCI][j]);
	}
	shExTrTableCellCSSGrandTotal(shExTrTableCells[TCI][25]);
	
	//Show or hide rows
	for (let i = 0; i < 24; i++){
		if (timeTotals[i] > 0) shExTrTableRows[i+1].style.display = '';
		else shExTrTableRows[i+1].style.display = 'none';
	}
}

//Function for making all the data cells of the table empty
function shExTrClearTable() {
	for (let i = 0; i < 26; ++i){
		for (let j = 1; j < shExTrTableCells.length; ++j){
			shExTrTableCells[j][i].innerHTML = "";
		}
	}
}

//Function for combining data of the same username when building the table.
function shExTrCollapseDataByUsername(data){
	for (let i = 0; i < data.length - 1; i++){
		let name = data[i].username;
		for (let j = i + 1; j < data.length; j++){
			if (data[j].username == name){
				for (let h = 0; h < 24; h++){
					data[i]['h'+h] += data[j]['h'+h];
				}
				data.splice(j,1);
				j--;
			}
		}
	}
}

//Function for setting the CSS of a table cell to be normal
function shExTrTableCellCSSNormal(cell) {
	cell.style.color = 'white';
	cell.style.fontWeight = '';
}

//Function for setting the CSS of a table cell to be normal
function shExTrTableCellCSSTotal(cell) {
	cell.style.color = 'orange';
	cell.style.fontWeight = '800';
}

//Function for setting the CSS of a table cell to be normal
function shExTrTableCellCSSGrandTotal(cell) {
	cell.style.color = 'yellow';
	cell.style.fontWeight = '800';
}
//#endregion

//#region Network

//Function for requesting usernames and counts from Google Sheet
function shExTrRequestCountsAndNames(){
	shExTrHasRefreshedCounts = true;
	if (!shExTrCountsBeingRequested){
		console.log('Getting counts and names from Google Sheet...');
		shExTrWebRequest(shExTrGoogleSheetURL, JSON.stringify({'postType': 'GetCountsAndNames','location': shExTrLocationName}), shExTrOnLoadCountsAndNames);
		shExTrCountsBeingRequested = true;
	}
}

//Function for requesting counts from Google Sheet
function shExTrRefreshCountsFromGoogleSheet(){
	shExTrHasRefreshedCounts = true;
	if (!shExTrCountsBeingRequested){
		console.log('Getting counts from Google Sheet...');
		shExTrWebRequest(shExTrGoogleSheetURL, JSON.stringify({'postType': 'GetCounts','location': shExTrLocationName}), shExTrOnLoadRefreshCountsFromGoogleSheet);
		shExTrCountsBeingRequested = true;
	}
}

//Function for posting the current post request to google sheets.
function shExTrSendPostRequest(){
	console.log("Posting counts...");
	shExTrWebRequest(shExTrGoogleSheetURL, JSON.stringify(shExTrPostRequest), shExTrPostResponse);
}

//Function for requesting usernames from Google Sheet
function shExTrLoadValidUsernames(){
	console.log('Loading usernames...');
	shExTrWebRequest(shExTrGoogleSheetURL, JSON.stringify({'postType': 'GetNames'}), shExTrLoadUsernamesResponse);
}
//#endregion

//#region Event Handlers
//Callback function for clicking on the Logout Button.
function shExTrOnButtonLogoutClick(){
	shExTrIsLoggedIn = false;
	shExTrLoginToken = '';
	shExTrLoginName = 'no_user';
	shExTrSetVisualAsLoggedOut();
	shExTrHasShippedSinceLogIn = false;
	$('#' + status_lbl_id).text('Logged out.').css('color', 'red');
	
	//Remove login cookies.
	const d = new Date();
	let expires = 'expires='+ d.toUTCString();
	document.cookie = 'ShExTrName=;' + expires + ';';
	document.cookie = 'ShExTrToken=;' + expires + ';';
	
	shExTrFocusLoadOrUser();
}

//Callback functoin for clicking on the Refresh counts button under the table.
function shExTrOnButtonRefreshCountsClick(){
	shExTrRefreshCountsFromGoogleSheet();
	shExTrFocusLoadOrUser();
}

//Callback function for clicking on the Login Button.
function shExTrOnButtonLoginClick(){
	if (shExTrValidUsernames.length <= 0){
		if (!shExTrLoadingUsernames) shExTrLoadValidUsernames();
		$('#' + status_lbl_id).text('Validating username. Please try again in a couple seconds.').css('color', 'red');
		return;
	}
	let isNameValid = false;
	let tempname = shExTrInputUser.value.toLowerCase()
	for (let i = 0; i < shExTrValidUsernames.length; i++){
		if (tempname == shExTrValidUsernames[i].username){
			isNameValid = true;
			if (shExTrLocationName != shExTrValidUsernames[i].location){
				shExTrLocationName = shExTrValidUsernames[i].location;
				shExTrSaveLocation();
				shExTrRefreshCountsFromGoogleSheet();
			}
			break;
		}
	}
	if (!isNameValid){
		$('#' + status_lbl_id).text('Invalid username! Please enter your username.').css('color', 'red');
		return;
	}
	if (!shExTrHasRefreshedCounts) shExTrRefreshCountsFromGoogleSheet();
	
	shExTrIsLoggedIn = true;
	shExTrLoginName = tempname;
	shExTrLoginToken = '1234';
	shExTrSetVisualAsLoggedIn();
	shExTrHasShippedSinceLogIn = false;
	shExTrPersonalDataDoLogin();
	$('#' + status_lbl_id).text('Logged in for counting.').css('color', 'green');
	shExTrInputUser.value = '';
	
	//Add login token cookies, so the login session will attempt to remain on page reload.
	const d = new Date();
	d.setTime(d.getTime() + (1*24*60*60*1000));
	d.setHours(0);
	d.setMinutes(0);
	let expires = 'expires='+ d.toUTCString();
	document.cookie = 'ShExTrName=' + shExTrLoginName + ';' + expires + ';';
	document.cookie = 'ShExTrToken=' + shExTrLoginToken + ';' + expires + ';';
	
	shExTrFocusLoadOrUser();
}

//Callback function for clicking on the Autoship Button.
function shExTrOnButtonAutoClick(){
	shExTrDoAutoship = !shExTrDoAutoship;
	if (!shExTrDoAutoship) shExTrAutoButton.innerHTML = 'Autoship OFF';
	else shExTrAutoButton.innerHTML = 'Autoship ON';
	shExTrFocusLoadOrUser();
}

//Callback function for clicking on the View Counts Button.
function shExTrOnButtonViewCountsClick(){
	if (shEvTrCountsTableShown == false){
		shExTrCountsButton.innerHTML = "Hide Counts";
		shExTrTable.style.display = 'table';
		shExTrRefreshCountsButton.style.display = '';
		shEvTrCountsTableShown = true;
	}
	else{
		shExTrCountsButton.innerHTML = "Show Counts";
		shExTrTable.style.display = 'none';
		shExTrRefreshCountsButton.style.display = 'none';
		shEvTrCountsTableShown = false;
	}
	shExTrFocusLoadOrUser();
}

//Callback function for key being raised when in the Username Input.
function shExTrOnInputUsernameKeyUp(event){
	// Number 13 is the "Enter" key on the keyboard
	if (event.keyCode === 13) {
		// Cancel the default action
		event.preventDefault();
		
		shExTrLoginButton.click();
	}
}

//Callback function for Load Input being changed.
function shExTrOnInputLoadChange(event){
	let barcode = event.target.value;
	if (typeof barcode !== 'undefined' && barcode != ""){
		shExTrScannedBarcode = barcode;
	}
}

//#region Network
function shExTrOnWebRequestError(){
	console.log("Webrequest Error!");
	webRequest(shExTrPreviousWebRequest.url, shExTrPreviousWebRequest.data, shExTrPreviousWebRequest.loadCallback);
}

function shExTrOnWebRequestReadyStateChanged(){
	if (this.readyState === XMLHttpRequest.DONE){
		var status = this.status;
		if ((status >= 300 && status < 400)){
			console.log("Webrequest status " + status + ": Redirect! Retrying!");
			webRequest(shExTrPreviousWebRequest.url, shExTrPreviousWebRequest.data, shExTrPreviousWebRequest.loadCallback);
			return;
		}
		if ((status >= 400)){
			console.log("Webrequest status " + status + ": Error! Retrying!");
			webRequest(shExTrPreviousWebRequest.url, shExTrPreviousWebRequest.data, shExTrPreviousWebRequest.loadCallback);
			return
		}
	}
}

function shExTrWebRequest(url, data, loadCallback){
	console.log('Sending webrequest...');
	isWaitingOnNetwork = true;
	shExTrPreviousWebRequest.url = url;
	shExTrPreviousWebRequest.data = data;
	shExTrPreviousWebRequest.loadCallback = loadCallback;
	var xhr = new XMLHttpRequest();
	xhr.open("post", url, true);
	xhr.setRequestHeader('Content-Type', 'text/plain');
	xhr.onerror = shExTrOnWebRequestError;
	xhr.onabort = shExTrOnWebRequestError;
	xhr.ontimeout = shExTrOnWebRequestError;
	xhr.onreadystatechange = shExTrOnWebRequestReadyStateChanged;
	xhr.onload = loadCallback;
	xhr.send(data);
}

function shExTrUpdateTableRefreshedLabel(){
	let d = new Date();
	let hours = d.getHours();
	let ampm = hours >= 12 ? 'PM' : 'AM';
	if (hours > 12) hours -= 12;
	if (hours == 0) hours = 12;
	let minutes = d.getMinutes();
	if (minutes < 10) minutes = "0" + minutes;
	shExTrTableCaption.innerHTML = "Daily Ship Counts. Refreshed at " + hours + ":" + minutes + " " + ampm + ".";
}

//Callback function for request when loading usernames and counts from Google Sheet
function shExTrOnLoadCountsAndNames(){
	shExTrCountsBeingRequested = false;
	try{
		var response = JSON.parse(this.responseText);
		if (response.result == 'success'){
			shExTrBuildTable(response.counts.data);
			shExTrUpdateTableRefreshedLabel();
			
			let names = response.names.names.split(',');
			let locations = response.names.locations.split(',');
			for (let i = 0; i < names.length; i++){
				if (names[i] != '') shExTrValidUsernames.push({'username':names[i],'location':locations[i]});
			}
			console.log('Count and Names request successful.');
		}
		else{
			throw {"description":"Error in response from server!"};
		}
	}
	catch (e){
		console.log('Count and Names request unsuccessful: ' + this.responseText);
		console.log(e.description);
	}
}

//Callback function for request when loading counts from Google Sheet
function shExTrOnLoadRefreshCountsFromGoogleSheet(){
	shExTrCountsBeingRequested = false;
	try{
		var response = JSON.parse(this.responseText);
		if (response.result == 'success'){
			shExTrBuildTable(response.data);
			shExTrUpdateTableRefreshedLabel();
			console.log('Count request successful.');
		}
		else{
			throw {"description":"Error in response from server!"};
		}
	}
	catch (e){
		console.log('Count request unsuccessful: ' + this.responseText);
		console.log(e.description);
	}
}

//Callback function for request to post counts to Google Sheet
function shExTrPostResponse(){
	try{
		var response = JSON.parse(this.responseText);
		if (response.result == 'success'){
			console.log('Post successful.');
			shExTrPostRequest = null;
			shExTrSavePostRequest();
		}
		else{
			throw {"description":"Error in response from server!"};
		}
	}
	catch (e){
		console.log('Post unsuccessful: ' + this.responseText);
	}
	shExTrRefreshCountsFromGoogleSheet();
}

//Callback function for request when loading usernames from Google Sheet
function shExTrLoadUsernamesResponse(){
	shExTrLoadingUsernames = false;
	try{
		var response = JSON.parse(this.responseText);
		if (response.result == 'success'){
			let names = response.names.split(',');
			let locations = response.locations.split(',');
			for (let i = 0; i < names.length; i++){
				if (names[i] != '') shExTrValidUsernames.push({'username':names[i],'location':locations[i]});
			}
			console.log('Usernames request successful.');
		}
		else{
			throw {"description":"Error in response from server!"};
		}
	}
	catch (e){
		console.log('Usernames request unsuccessful: ' + this.responseText);
		console.log(e);
	}
}
//#endregion
//#endregion

//#region PersonalData

//Function for creating a new Personal Data object with the current active username.
function shExTrPersonalDataCreateNew(){
	if (!shExTrIsLoggedIn) return null;
	let person = new PersonalData();
	person.username = shExTrLoginName;
	person.loginTick = Date.now();
	shExTrPersonalData.push(person);
	return person;
}

//Function for finding and returning the active Personal Data object, creating it if it doesn't exist.
function shExTrPersonalDataFindActive(){
	for (let i = 0; i < shExTrPersonalData.length; i++){
		if (shExTrPersonalData[i].username == shExTrLoginName) return shExTrPersonalData[i];
	}
	return shExTrPersonalDataCreateNew();
}

//Use this function when logging in to reset personal data login counts.
function shExTrPersonalDataDoLogin(){
	if (!shExTrIsLoggedIn) return;
	let person = shExTrPersonalDataFindActive();
	person.loginTick = Date.now();
	person.countSinceLogin = 0;
}

//Use this function to reset the personal data counts after an hour passes.
function shExTrPersonalDataResetHour(){
	let d = new Date();
	d.setMinutes(0);
	d.setSeconds(0);
	d.setMilliseconds(0);
	
	for (let i = 0; i < shExTrPersonalData.length; i++){
		shExTrPersonalData[i].loginTick = d.getTime();
		shExTrPersonalData[i].countSinceLogin = 0;
		shExTrPersonalData[i].hourCount = 0;
	}
}

//Use this function to add 1 to the personal data count.
function shExTrPersonalDataAddCount(){
	if (!shExTrIsLoggedIn) return;
	let person = shExTrPersonalDataFindActive();
	person.hourCount++;
	person.countSinceLogin++;
}

//#endregion

//#region Cookies
//Function for loading a cookie from the current webpage with the given name
function shExTrGetCookie(cname) {
	let name = cname + "=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(';');
	for(let i = 0; i <ca.length; i++) {
	let c = ca[i];
	while (c.charAt(0) == ' ') {
		c = c.substring(1);
	}
	if (c.indexOf(name) == 0) {
		return c.substring(name.length, c.length);
	}
	}
	return "";
}

//Function for loading the current post request from cookies.
function shExTrLoadPostRequest() {
	try{
		let c = shExTrGetCookie('ShExTrPostRequest');
		if (c != '' && c != 'null'){
			shExTrPostRequest = JSON.parse(c);
		}
	}
	catch (e){
		//Cookie error, just ignore
		console.log('ShipExecTrack: Error loading post request from cookies.');
	}
}

//Function for saving the current post request to cookies.
function shExTrSavePostRequest() {
	//Compute cookie expiry time for 1 year from now, and cookie name
	const d = new Date();
	let cname = 'ShExTrPostRequest';
	d.setTime(d.getTime() + (365*24*60*60*1000));
	let expires = 'expires='+ d.toUTCString();
	
	document.cookie = cname + '=' + JSON.stringify(shExTrPostRequest) + ';' + expires + '; path=/';
}

//Function for loading the current location from cookies.
function shExTrLoadLocation() {
	try{
		let c = shExTrGetCookie('shExTrLocationName');
		if (c != '' && c != 'null'){
			shExTrLocationName = c;
		}
	}
	catch (e){
		//Cookie error, just ignore
		console.log('ShipExecTrack: Error loading location from cookies.');
	}
}

//Function for saving the current location to cookies.
function shExTrSaveLocation() {
	//Compute cookie expiry time for 1 year from now, and cookie name
	const d = new Date();
	let cname = 'shExTrLocationName';
	d.setTime(d.getTime() + (365*24*60*60*1000));
	let expires = 'expires='+ d.toUTCString();
	
	document.cookie = cname + '=' + shExTrLocationName + ';' + expires + '; path=/';
}

//Use this function to save personal data to cookies.
function shExTrPersonalDataSaveAll(){
	//Compute cookie expiry time for the end of this hour, and cookie name
	const d = new Date();
	let cname = 'ShExTrPersonal';
	d.setTime(d.getTime() + (60*60*1000));
	d.setMinutes(0);
	d.setSeconds(0);
	d.setMilliseconds(0);
	let expires = 'expires='+ d.toUTCString();
	
	let cstring = JSON.stringify(shExTrPersonalData);
	
	document.cookie = cname + '=' + cstring + ';' + expires + ';';
}

//Use this function to load personal data from cookies.
function shExTrPersonalDataLoadAll(){
	try{
		let c = shExTrGetCookie('ShExTrPersonal');
		if (c != ''){
			shExTrPersonalData = JSON.parse(c);
		}
	}
	catch (e){
		//Cookie error, just ignore
		console.log('ShipExecTrack: Error loading personal data from cookies.');
	}
	
	//Update the metrics label text.
	shExTrUpdateMetricsLabel();
}

//Function for loading the unsent counts from cookies.
function shExTrLoadUnsentCounts() {
	shExTrUnsentCounts = new Array(0);
	try{
		const d = new Date();
		let c = shExTrGetCookie('ShExTrUCs');
		if (c != ''){
			console.log("Unsent Counts Cookie: " + c);
			let args = c.split(',');
			for (let i = 0; i < args.length-28; i += 29){
				var thisCount = new UnsentCountsObject();
				thisCount.username = args[i];
				thisCount.day = parseInt(args[i+1]);
				thisCount.month = parseInt(args[i+2]);
				thisCount.year = parseInt(args[i+3]);
				thisCount.h0 = parseInt(args[i+4]);
				thisCount.h1 = parseInt(args[i+5]);
				thisCount.h2 = parseInt(args[i+6]);
				thisCount.h3 = parseInt(args[i+7]);
				thisCount.h4 = parseInt(args[i+8]);
				thisCount.h5 = parseInt(args[i+9]);
				thisCount.h6 = parseInt(args[i+10]);
				thisCount.h7 = parseInt(args[i+11]);
				thisCount.h8 = parseInt(args[i+12]);
				thisCount.h9 = parseInt(args[i+13]);
				thisCount.h10 = parseInt(args[i+14]);
				thisCount.h11 = parseInt(args[i+15]);
				thisCount.h12 = parseInt(args[i+16]);
				thisCount.h13 = parseInt(args[i+17]);
				thisCount.h14 = parseInt(args[i+18]);
				thisCount.h15 = parseInt(args[i+19]);
				thisCount.h16 = parseInt(args[i+20]);
				thisCount.h17 = parseInt(args[i+21]);
				thisCount.h18 = parseInt(args[i+22]);
				thisCount.h19 = parseInt(args[i+23]);
				thisCount.h20 = parseInt(args[i+24]);
				thisCount.h21 = parseInt(args[i+25]);
				thisCount.h22 = parseInt(args[i+26]);
				thisCount.h23 = parseInt(args[i+27]);
				thisCount.lpns = args[i+28];
				shExTrUnsentCounts.push(thisCount);
			}
		}
	}
	catch (e){
		//Cookie error, just ignore
		console.log('ShipExecTrack: Error loading unsent ship counts from cookies.');
	}
}

//Function for saving the unsent counts to cookies.
function shExTrSaveUnsentCounts() {
	//Compute cookie expiry time for 5 years, and cookie name
	const d = new Date();
	let cname = 'ShExTrUCs';
	d.setTime(d.getTime() + (5*365*24*60*60*1000));
	d.setHours(0);
	let expires = 'expires='+ d.toUTCString();
	
	let cstring = "";
	for (let i = 0; i < shExTrUnsentCounts.length; ++i){
		cstring += shExTrUnsentCounts[i].username + ',';
		cstring += shExTrUnsentCounts[i].day + ',';
		cstring += shExTrUnsentCounts[i].month + ',';
		cstring += shExTrUnsentCounts[i].year + ',';
		cstring += shExTrUnsentCounts[i].h0 + ',';
		cstring += shExTrUnsentCounts[i].h1 + ',';
		cstring += shExTrUnsentCounts[i].h2 + ',';
		cstring += shExTrUnsentCounts[i].h3 + ',';
		cstring += shExTrUnsentCounts[i].h4 + ',';
		cstring += shExTrUnsentCounts[i].h5 + ',';
		cstring += shExTrUnsentCounts[i].h6 + ',';
		cstring += shExTrUnsentCounts[i].h7 + ',';
		cstring += shExTrUnsentCounts[i].h8 + ',';
		cstring += shExTrUnsentCounts[i].h9 + ',';
		cstring += shExTrUnsentCounts[i].h10 + ',';
		cstring += shExTrUnsentCounts[i].h11 + ',';
		cstring += shExTrUnsentCounts[i].h12 + ',';
		cstring += shExTrUnsentCounts[i].h13 + ',';
		cstring += shExTrUnsentCounts[i].h14 + ',';
		cstring += shExTrUnsentCounts[i].h15 + ',';
		cstring += shExTrUnsentCounts[i].h16 + ',';
		cstring += shExTrUnsentCounts[i].h17 + ',';
		cstring += shExTrUnsentCounts[i].h18 + ',';
		cstring += shExTrUnsentCounts[i].h19 + ',';
		cstring += shExTrUnsentCounts[i].h20 + ',';
		cstring += shExTrUnsentCounts[i].h21 + ',';
		cstring += shExTrUnsentCounts[i].h22 + ',';
		cstring += shExTrUnsentCounts[i].h23 + ',';
		cstring += shExTrUnsentCounts[i].lpns + ',';
	}
	
	document.cookie = cname + '=' + cstring + ';' + expires + ';';
}
//#endregion

//#region Constructors
//Function for constructing a new Personal Data object.
function PersonalData(){
	this.username = '';
	this.hourCount = 0;
	this.loginTick = 0;
	this.countSinceLogin = 0;
	return this;
}

//Function for constructing a new Unsent Counts object.
function UnsentCountsObject() {
	this.postType = "PostCounts";
	this.username = "";
	this.day = 0;
	this.month = 0;
	this.year = 0;
	this.h0 = 0;
	this.h1 = 0;
	this.h2 = 0;
	this.h3 = 0;
	this.h4 = 0;
	this.h5 = 0;
	this.h6 = 0;
	this.h7 = 0;
	this.h8 = 0;
	this.h9 = 0;
	this.h10 = 0;
	this.h11 = 0;
	this.h12 = 0;
	this.h13 = 0;
	this.h14 = 0;
	this.h15 = 0;
	this.h16 = 0;
	this.h17 = 0;
	this.h18 = 0;
	this.h19 = 0;
	this.h20 = 0;
	this.h21 = 0;
	this.h22 = 0;
	this.h23 = 0;
	this.station = shExTrStationName;
	this.lpns = "";
	return this;
}
//#endregion