
Status = new Meteor.Collection('status');
Items = new Meteor.Collection('items');

if (Meteor.isClient) {

Meteor.subscribe('lists');
Meteor.subscribe('cards');

Template.body.helpers({
	slideWidth : function() {
		var count = Status.find({
			creator : Meteor.userId()
		}).count() + 3;
		return (320*count) + "px";
	},
	constraintWidth : function() {
		var count = Status.find({
			creator : Meteor.userId()
		}).count() + 1;
		return (320*count) + "px";
	}
});

Template.body.events({
	'click a.addlist' : function(e) {
		e.preventDefault();
		$('#form-addlist').show().find('input').first().focus();
	},
	'submit #form-addlist' : function(e) {
		e.preventDefault();
		var titleInput = $(e.target).children("#list-title-input"),
			title = titleInput.val(),
			last = $('.list-constraint').children('.listContainer').last().get(0),
			priority = 100;
		
		if (last) {
			priority = Blaze.getData(last).priority + 10;
		}

		Meteor.call('statusInsert', title, priority, function (error, result) {
			titleInput.val('');
			$(e.target).hide();
		});
	}
});

Template.lists.helpers({
	lists : function() {
		return Status.find({
			creator : Meteor.userId()
		}, {sort: {priority : 1}} );
	},
	archived : function() {
		return Items.find({archived : true});
	},
});

Template.listSingle.helpers({
	title : function() {
		return this.title;
	},
	items : function() {
		return Items.find({statusId : this._id}, {sort: {priority : 1}} );
	}
});

Template.listSingle.onRendered(function() {
	$('.list-constraint').sortable({
		placeholder: "ui-list-placeholder",
		forcePlaceholderSize : true,
		stop : function(e, ui) {
			var id = Blaze.getData(ui.item.get(0))._id;
			var before = ui.item.prev().get(0);
			var after = ui.item.next().get(0);
			var priority = 0;

			if (!before && !after) { // its alone
				priority = 10;
			} else if (!before && after) { // its the first
				priority = Blaze.getData(after).priority - 1
			} else if (!after && before) { // its the last
				priority = Blaze.getData(before).priority + 1
			} else { // its between items
				priority = (Blaze.getData(after).priority +
                       Blaze.getData(before).priority)/2;
			}

			
			Meteor.call('statusUpdate', id, priority, function(e,r) {});
		}
	}).disableSelection();
	
	$('ul.sortable').sortable({
		connectWith : '.sortable',
		placeholder: "ui-item-placeholder",
		forcePlaceholderSize : true,
		stop : function(e, ui) {
			var item = Blaze.getData(ui.item.get(0));
			var list = $(ui.item).parent('ul');
			var status = Blaze.getData(list.get(0));
			var before = ui.item.prev().get(0);
			var after = ui.item.next().get(0);
			var priority = 0;

			if (!before && !after) {

			} else if (!before && after) {
				priority = Blaze.getData(after).priority - 1
			} else if (!after && before) {
				priority = Blaze.getData(before).priority + 1
			} else {
				priority = (Blaze.getData(after).priority +
                       Blaze.getData(before).priority)/2;
			}

			
			Meteor.call('itemListUpdate',item, status, priority, function(e,r) {});
		}
	}).disableSelection();
});

Template.listSingle.events({
	'click a.removelist' : function(e) {
		var id = this._id;
		Meteor.call('statusRemove', id, function(error, result) {});
	},
	'click a.addone' : function(e) {
		e.preventDefault();
		$(e.target).siblings('#form-addItem').show().find('input').first().focus();;
	},
	'blur #item-title-input' : function(e) {
		$(e.target).parent('form').hide();
	},
	'submit #form-addItem' : function(e) {
		e.preventDefault();
		var titleInput = $(e.target).children("#item-title-input"),
			title = titleInput.val(),
			status = this._id;
			list = $(e.target).parent('div').siblings('ul'),
			last = list.children('li').last().get(0),
			priority = 10;

		if (last) {
			priority = Blaze.getData(last).priority + 10;
		}
			 
		Meteor.call('itemInsert', title, status, priority, function (error, result) {
			titleInput.val('');
			$(e.target).hide();
		});
	}
});

Template.item.helpers({
	title : function() {
		return this.title;
	},
	status : function() {
		var s = Status.findOne({_id: this.statusId});
		return s.title;
	}
});

Template.item.events({
	'click .remove' : function(e) {
		e.preventDefault();
		id = this._id;
		Meteor.call('itemRemove', id, function(r,e) {});
	}
});

} // end is client

if (Meteor.isServer) {

	Meteor.publish('lists', function() {
		if (!this.userId) {
			return null;
		}

		return Status.find({
			creator : this.userId
		}, {sort: {priority : 1}} );

	});

	Meteor.publish('cards', function() {
		if (!this.userId) {
			return null;
		}

		return Items.find({
			creator : this.userId
		}, {sort: {priority : 1}} );

	});

}

Meteor.methods({
	statusInsert: function (title, priority) {
		Status.insert({
			title : title,
			priority : priority,
			creator : Meteor.user()._id
		});
	},
	statusUpdate : function(id, priority) {
		Status.update({_id : id}, {
			$set : {priority : priority}
		})
	},
	statusRemove : function(id) {
		Status.remove({_id : id}, function(error) {
			if (!error) {
				Items.update({statusId : id}, {
					$set : {statusId : ''},
					$set : {archive : true}
				});
			}
		});
	},
	itemInsert: function(title, status, priority) {
		Items.insert({
			title: title,
			statusId: status,
			priority : priority,
			creator : Meteor.user()._id
		});
	},
	itemListUpdate : function(item, status, priority) {
		Items.update({_id : item._id},{
			$set : {
				statusId : status._id,
				priority : priority
			},
		});
	},
	itemRemove : function(id) {
		Items.remove({_id : id});
	}
});
