function encryptPassword(password) {
	return password ? encodeHSA1(getProperty("passwordSalt") + password) : "";
}
