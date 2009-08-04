////////////////////////////////////////////////////////////////////////
// Roles

// Flags to check single attributes. A role consists of more of one of these
// e.g. the superuser has all the flags set.

// TODO: Should ADMIN, ROOT directly follow EDIT, and DISABLED, UNVERIFIED
// come right after? The user defined ones could just be at the end...
// Would be cleaner!

UserRole = {
	NONE: 			0x0000,
	READ:			0x0001,
	POST:			0x0002,
	EDIT:			0x0004,

	DISABLED:		0x0100,
	UNVERIFIED:		0x0200,

	ADMIN:			0x1000,
	ROOT:			0x2000
};

// Define your own, e.g.:
// UserRole.ROLE1 = 0x0008;
// UserRole.ROLE2 = 0x0010;
// UserRole.ROLE3 = 0x0020;
// UserRole.ROLE4 = 0x0040;
// UserRole.ROLE5 = 0x0080;
