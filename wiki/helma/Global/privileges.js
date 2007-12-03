var Privileges = {
	READ: 0,
	CREATE: 1,
	EDIT: 2,
	ADMINISTRATE: 3,
	
	check: function(privileges, user) {
		var flag; 
		if (privileges < Privileges.READ) {
			flag = User.FLAG_NONE;
		} else if (privileges < Privileges.EDIT) {
			flag = User.FLAG_READER;
		} else if (privileges <= Privileges.ADMINISTRATE) {
			flag = User.FLAG_EDITOR;
		} else {
			flag = User.FLAG_SUPERUSER;
		}
		return flag == User.FLAG_READER ? true : (User.getRole() & flag);
	}
};