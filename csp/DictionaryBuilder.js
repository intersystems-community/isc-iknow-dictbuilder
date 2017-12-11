hostURL = function(domain) {
	 if (!domain) { domain = ':domain'; }
	return location.href.split('/').slice(0,-1).join('/')+'/dbREST/Domain/'+domain+'/';
};

var dictApp = angular.module('dictApp', ['ngSanitize']);

dictApp.controller('DictionaryController', ['$scope', '$filter', '$sce', function($scope, $filter, $sce) {
	
	
	// initialize ikDomain
	function initDomain() {
	var domain = location.search.substr(1).split('#')[0];
	if (!isNaN(parseInt(domain))) return parseInt(domain);
	var regexp = /^([0-9]+)/;
	var parsed = regexp.exec(domain);
	if (parsed && (parsed.length>0) && !isNaN(parseInt(parsed[0]))) return parsed[0];
		alert('No domain specified in URL!'); 
		return 0;
	}
	$scope.ikDomain = initDomain();
	
	
	$scope.getBlacklists = function() {
     	$.get(hostURL($scope.ikDomain)+'Blacklists', function(data) {
			if ((data.blacklists==undefined) || (data.blacklists.length==0)) {
				$scope.blacklists = [{ name:'Default blacklist', entries:[]}];
			} else {
				$scope.blacklists = data.blacklists;
			}
			$scope.$apply();
		});
	}
	$scope.blacklists = [];
	$scope.getBlacklists();
	$scope.currentBlacklist = 0;
	$scope.addToBlacklist = function(data) {
		$scope.blacklists[$scope.currentBlacklist].entries.push(data);
		
		// to avoid a server query, remove from entity list
		for (e in $scope.entities) {
			if ($scope.entities[e].EntityValue == data) {
				$scope.entities[e].skip = true;
			}
		}
	}
	$scope.removeFromBlacklist = function(entry) {
		var arr = $scope.blacklists[$scope.currentBlacklist].entries;
		var index = $arr.indexOf(entry);
		$scope.blacklists[$scope.currentBlacklist].entries = arr.slice(0,index).concat(arr.slice(index+1));
	}
	$scope.selectBlacklist = function(index) {
		if ((index < $scope.blacklists.length) && (index >= 0)) {
			$scope.currentBlacklist = index;
		}
	}
	
	$scope.getMatches = true;
	$scope.getEntities = function (string, overrideGetMatches) {
		var bl = ($scope.blacklists.length > $scope.currentBlacklist) ? [$scope.blacklists[$scope.currentBlacklist].id] : [];
	  	$.ajax({
	  		url: hostURL($scope.ikDomain)+'Entities',
	  		method: 'POST',
	  		contentType: 'application/json; charset=UTF-8',
	  		data: JSON.stringify( {entity:string, blacklists:bl, getMatches:$scope.getMatches || overrideGetMatches} ),
  			success: function(data) {
				$scope.entities = data.Entities;
				$scope.$apply();
       		}
	  	});
	};
	$scope.getEntities("");
	
	$scope.typeEntity = function(event, overrideGetMatches) {
		if (event && ((event.keyCode==13) || (event.which==13))) {
			$scope.getEntities($scope.term, overrideGetMatches);
		}
	}
	
	
	$scope.getDictionaries = function() {
     	$.get(hostURL($scope.ikDomain)+'Dictionaries', function(data) {
			$scope.dictionaries = data.dictionaries;
			if (!$scope.dictionaries) $scope.dictionaries = [];
			$scope.$apply();
		});
	}
	$scope.getDictionaries();
	$scope.currentDictionary = 0;
	$scope.currentItem = {};
	$scope.createDictionary = function() {
		$scope.dictionaries.push({ name: $scope.dictName, items: []});
		$scope.dictName='';
	}
	$scope.selectDictionary = function(index) {
		if ((index < $scope.dictionaries.length) && (index >= 0))
			$scope.currentDictionary = index;
	}
	$scope.editDict = function(index) {
		$scope.currentDictionary = index;
		$('#modDict').modal('show');
	}
	$scope.dropDict = function(index) {
		var arr = $scope.dictionaries.slice(0,index);
		$scope.dictionaries = arr.concat($scope.dictionaries.slice(index+1));
		$('#modDict').modal('hide');
	}
	$scope.saveDict = function() {
		$('#modDict').modal('hide');
	}
	
	$scope.addTerm = function(term, item) {
		item.terms[item.terms.length] = { string: term };
		var sc = $scope.updateMatchScores(term);
		$scope.$apply();
	}
	$scope.updateMatchScores = function(term) {
		for (e in $scope.entities) {
			var ent = $scope.entities[e];
			if (ent.EntityValue == term) {
				ent.Matches.push({Dict:$scope.currentDictionary, Score:1});
				ent.HighestScore = 1;
			} else if (''.concat(ent.EntityValue).indexOf(term)>=0) { // quick best-effort lookup
				ent.Matches.push({Dict:$scope.currentDictionary, Score:1});
				if (ent.HighestScore < 1) {
					ent.HighestScore = 0.5;
				}
			}
		}
	}
	
	$scope.selectItem = function(item, newTerm) {
		$scope.currentItem = item;
		if (newTerm) { 
			$scope.currentItem.terms.push({ string: newTerm }); 
			$scope.$apply();
		}
		$('#modItem').modal('show');
		if (newTerm) {
			setTimeout(function() { $('.isc-term-string').last().get(0).focus() }, 500);
		}
	}
	$scope.newItem = function(term, saveImmediately) {
		$scope.currentItem = {  name: term, 
								uri: ':'+$scope.dictionaries[$scope.currentDictionary].name+':'+term, 
								terms: [{string:term}],
								isNew : !saveImmediately};
		if (saveImmediately) {
			$scope.dictionaries[$scope.currentDictionary].items.push($scope.currentItem);
			var sc = $scope.updateMatchScores(term);
		} else {
			$('#modItem').modal('show');
		}
		if (term != '') $scope.$apply();
	}
	$scope.saveItem = function() {
		if ($scope.currentItem.isNew) {
			$scope.currentItem.isNew = false;
			$scope.dictionaries[$scope.currentDictionary].items.push($scope.currentItem);
		}
		$('#modItem').modal('hide');
	}
	$scope.dropTerm = function(index) {
		var arr = $scope.currentItem.terms.slice(0,index);
		$scope.currentItem.terms = arr.concat($scope.currentItem.terms.slice(index+1));
	}
	$scope.dropItem = function(item) {
		var arr = [];
		for (i in $scope.dictionaries[$scope.currentDictionary].items) {
			var ii = $scope.dictionaries[$scope.currentDictionary].items[i];
			if (ii.uri != item.uri) {
				arr.push(ii);
			}
		}
		$scope.dictionaries[$scope.currentDictionary].items = arr;
		$('#modItem').modal('hide');
	}
	
	
	$scope.saveAll = function() {
	  $.ajax({
	  		url: hostURL($scope.ikDomain)+'Dictionaries',
	  		method: 'POST',
	  		contentType: 'application/json; charset=UTF-8',
	  		data: JSON.stringify( {'dictionaries':$scope.dictionaries, 'blacklists':$scope.blacklists} ),
  			success: function(data) {
				$scope.getDictionaries();
				$scope.getBlacklists();
				$scope.getEntities($scope.term);
       		}
	  });
	}
	
	$scope.filterEntities = function(prop){
	    return function(item){
		  if (item.HighestScore == null) return true;
	      return (item.HighestScore < $scope.entFilter) && !item.skip;
	    }
	}
	$scope.entFilter = 2;
}]);



var _isc_drag_scroll = false;
dictApp.directive('iscDraggable', function($document) {
	
	var mouseX, mouseY;
    $document.on("dragover", function(event){
      mouseY = event.originalEvent.clientY;
    });
    
    return {
        scope: {
	        data: '@iscDraggable'
	    },
	    link : function(scope, element, attr) {
		    
	        // this gives us the native JS object
	        var el = element[0];

	        el.draggable = true;

	        el.addEventListener(
	            'dragstart',
	            function(e) {
	                e.dataTransfer.effectAllowed = 'move';
	                e.dataTransfer.setData('DragValue', scope.data);
	                var targets = $('.isc-droppable');
	                targets.filter('.btn').removeClass('btn-default').addClass('btn-info');
	                targets.filter('tr').addClass('info');
	                targets.filter('.panel-body').addClass('bg-info');
	                return false;
	            },
	            false
	        );
	        
	        el.addEventListener(
	            'dragend',
	            function(e) {
		            _isc_drag_scroll = false;
	                var targets = $('.isc-droppable');
	                targets.filter('.btn').removeClass('btn-info').addClass('btn-default');
	                targets.filter('tr').removeClass('info');
	                targets.filter('.panel-body').removeClass('bg-info');
	                return false;
	            },
	            false
	        );
	        
	        el.addEventListener(
	        	'drag',
	        	function(e) {
		        	_isc_drag_scroll = false;
			        if (mouseY < 50) {
			            _isc_drag_scroll = true;
			            _iscDragScroll(-1);
			        }
			        if (mouseY > (window.innerHeight - 50)) {
			            _isc_drag_scroll = true;
			            _iscDragScroll(1);
			        }
	        	}
	        );
    	}
    }
});

_iscDragScroll = function(step) {
    var scrollY = $(window).scrollTop();
    $(window).scrollTop(scrollY + step);
    if (_isc_drag_scroll) {
        setTimeout(function () { _iscDragScroll(step) }, 20);
    }
}

dictApp.directive('iscDroppable', function() {
    return {
        scope: {
	        dropFunction: '&iscDroppable',
	        dragEnterFunction: '&iscDragEnter'
	    },
        link: function(scope, element) {
            // again we need the native object
            var el = element[0];
            
            el.addEventListener(
			    'dragover',
			    function(e) {
			        e.dataTransfer.dropEffect = 'move';
			        // allows us to drop
			        if (e.preventDefault) e.preventDefault();
			        return false;
			    },
			    false
			);
			
			el.addEventListener(
			    'dragenter',
			    function(e) {
			        //this.classList.add('over');
			        var sc = scope.dragEnterFunction({data: e.dataTransfer.getData('DragValue')});
			        scope.$apply();
			        return false;
			    },
			    false
			);
			
			el.addEventListener(
			    'drop',
			    function(e) {
			        // Stops some browsers from redirecting.
			        if (e.stopPropagation) e.stopPropagation();
	                var sc = scope.dropFunction({data: e.dataTransfer.getData('DragValue')});
	                scope.$apply();
			        return false;
			    },
			    false
			);
        }
    }
});