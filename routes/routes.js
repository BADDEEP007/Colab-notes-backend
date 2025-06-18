import { Router } from 'express';
import {  getallnotes, postnotes ,DeleteNotebyTitle, getNotebyTitle, updateNote } from '../middleware/mainApiFunction.js';
import { setHeaders } from '../middleware/HelperApiFunction.js';
const router = Router();


router.get('/api/notes/get',setHeaders('GET'),getallnotes);
router.get('/api/notes/get/title/:title',setHeaders('GET'),getNotebyTitle);
router.post('/api/notes/add',setHeaders('POST'),postnotes);
router.delete('/api/notes/delete',setHeaders('DELETE'),DeleteNotebyTitle );
router.put('/api/notes/update/:title',setHeaders('PUT'),updateNote);        

export default router;