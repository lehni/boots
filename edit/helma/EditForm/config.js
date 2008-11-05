// Constant values:
// Do not modify or copy!
EditForm.BUTTON_MODE_BACK = 1;
EditForm.BUTTON_MODE_STAY = 2;
// To force Apply & Close
EditForm.BUTTON_MODE_APPLY_CLOSE = 4;

// Config switches:

// The action to be used to edit the object. Default is edit, corresponding with
// the edit_action.
EditForm.ACTION_EDIT = 'edit';
EditForm.ACTION_RENDER = 'main';

// Global switch for making objects removable.
// Overridden by EditForm#removable
EditForm.REMOVABLE = false;
// Global switch for making objects previewable.
// Overridden by EditForm#previewable
EditForm.PREVIEWABLE = true;

// BUTTON_MODE can be any of these:
// 		EditForm.BUTTON_MODE_BACK
// 		EditForm.BUTTON_MODE_STAY
// 		EditForm.BUTTON_MODE_BACK | EditForm.BUTTON_MODE_STAY
EditForm.BUTTON_MODE = EditForm.BUTTON_MODE_BACK;

// Global switch for making the title bar of the editor visible.
// Overridden by EditForm#showTitle
EditForm.SHOW_TITLE = true;
EditForm.SHOW_PATH = true;
// Global switch for making the progress bar in the title visible.
// Overridden by EditForm#showProgress
EditForm.SHOW_PROGRESS = true;
// Global switch for making the prototype visible.
// Overridden by EditForm#showPrototype
EditForm.SHOW_PROTOTYPE = false;

// Display labels on the left instead of the top of the row.
EditForm.LABEL_LEFT = false;
// The width value to be used in tables. Can be in pecent, otherwise pixels.
EditForm.WIDTH = "100%";

// Titles
EditForm.TITLE_BACK = 'Back';
EditForm.TITLE_CLOSE = 'Close';
EditForm.TITLE_CREATE = 'Create';
EditForm.TITLE_APPLY = 'Save';

EditForm.TITLE_APPLY_BACK = 'Save & Back';
EditForm.TITLE_CREATE_BACK = 'Create & Back';

EditForm.TITLE_APPLY_CLOSE = 'Save & Close';
EditForm.TITLE_CREATE_CLOSE = 'Create & Close';

EditForm.TITLE_APPLY_PREVIEW = 'Save & Preview';
EditForm.TITLE_CREATE_PREVIEW = 'Create & Preview';
