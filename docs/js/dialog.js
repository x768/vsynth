import { $e } from './utils.js';

export class FileDialogSet
{
    constructor(lang) {
        this.lang = lang;

        this.dialog = document.getElementById('dialog');
        this.file_input = document.getElementById('input-file-open');
        this.upload_area = document.getElementById('dialog-upload');
        this.download_area = document.getElementById('dialog-download');
        this.filelist_area = document.getElementById('dialog-filelist');
        this.filename_area = document.getElementById('dialog-filename');
        this.filename_input = document.getElementById('dialog-filename-input');
        this.ok_button = document.getElementById('dialog-ok');
        this.cancel_button = document.getElementById('dialog-cancel');
        this.warning_message = document.getElementById('dialog-warning-message');

        this.url = null;
        this.resolve = null;
        this.result = null;
        this.on_press_ok = null;
        this.on_upload_file = null;

        this.dialog.addEventListener('close', () => {
            if (this.url) {
                if (this.url instanceof Array) {
                    for (const url of this.url) {
                        URL.revokeObjectURL(url);
                    }
                } else {
                    URL.revokeObjectURL(this.url);
                }
                this.url = null;
            }
            this.#hide_controls();
            if (this.resolve) {
                this.resolve(this.result);
                this.resolve = null;
            }
        });
        this.ok_button.addEventListener('click', () => {
            if (this.on_press_ok) {
                this.on_press_ok();
            } else {
                this.result = this.filename_input.value;
                this.dialog.close();
            }
        });
        this.cancel_button.addEventListener('click', () => {
            this.result = null;
            this.dialog.close();
        });
        this.filename_input.addEventListener('change', () => {
            this.#on_update_filename();
        });
        this.file_input.addEventListener('change', e => {
            const f = e.currentTarget.files;
            if (f.length === 1) {
                if (this.on_upload_file) {
                    this.on_upload_file(f[0]);
                } else {
                    this.result = f[0];
                    this.dialog.close();
                }
            }
        });
        this.upload_area.addEventListener('click', () => {
            this.file_input.click();
        });
        this.upload_area.addEventListener('dragenter', e => {
            e.preventDefault();
            e.currentTarget.classList.add('dialog-drop-active');
        });
        this.upload_area.addEventListener('dragover', e => {
            e.preventDefault();
        });
        this.upload_area.addEventListener('dragleave', e => {
            e.preventDefault();
            e.currentTarget.classList.remove('dialog-drop-active');
        });
        this.upload_area.addEventListener('drop', e => {
            e.preventDefault();
            e.currentTarget.classList.remove('dialog-drop-active');
            const f = e.dataTransfer.files;
            if (f.length === 1) {
                if (this.on_upload_file) {
                    this.on_upload_file(f[0]);
                } else {
                    this.result = f[0];
                    this.dialog.close();
                }
            }
        });
        this.#hide_controls();
    }

    #hide_controls() {
        this.ok_button.style.display = 'none';
        this.upload_area.style.display = 'none';
        this.download_area.style.display = 'none';
        this.filelist_area.style.display = 'none';
        this.filename_area.style.display = 'none';
        this.filename_input.value = '';
        this.warning_message.style.display = 'none';
        this.on_press_ok = null;
        this.on_upload_file = null;
    }

    #show_dialog() {
        const { promise, resolve } = Promise.withResolvers();
        this.resolve = resolve;
        this.result = null;
        this.dialog.showModal();
        return promise;
    }

    show_delete_conform(db) {
        this.ok_button.textContent = this.lang.res.ok;
        this.ok_button.style.display = '';
        this.ok_button.disabled = false;
        this.cancel_button.textContent = this.lang.res.cancel;
        this.warning_message.style.display = '';
        this.on_press_ok = () => {
            this.dialog.setAttribute('closedby', 'none');
            this.ok_button.disabled = true;
            this.cancel_button.disabled = true;
            this.warning_message.textContent = this.lang.res['delete-complete'];
            db.delete_database();
        };

        this.#show_dialog();
    }

    show_upload(filter) {
        this.cancel_button.textContent = this.lang.res.close;
        this.upload_area.style.display = '';
        this.file_input.setAttribute('accept', filter);
        return this.#show_dialog();
    }

    show_download(file, filename) {
        this.cancel_button.textContent = this.lang.res.close;
        this.download_area.style.display = '';

        this.url = URL.createObjectURL(file);
        const button = document.getElementById('dialog-download-button');
        button.setAttribute('href', this.url);
        button.setAttribute('download', filename);
        document.getElementById('dialog-download-filename').textContent = filename;
        return this.#show_dialog();
    }

    show_download_list(files) {
        this.cancel_button.textContent = this.lang.res.close;
        this.filelist_area.style.display = '';
        this.filename_area.style.display = '';

        this.filelist_area.replaceChildren();
        this.url = [];
        for (const [f, fname] of files) {
            const url = URL.createObjectURL(f);
            this.url.push(url);
            const checkbox = $e('input',{type:'checkbox'});
            const link = $e('a', {href:url, download:fname}, fname);
            const row = $e('div', {'class':'file-list-item active'}, checkbox, link);
            this.filelist_area.appendChild(row);
            checkbox.addEventListener('change', e => {
                const t = e.currentTarget;
                if (t.checked) {
                    t.parentNode.classList.remove('active');
                } else {
                    t.parentNode.classList.add('active');
                }
            });
            link.addEventListener('click', e => {
                const t = e.currentTarget;
                const check = t.parentNode.getElementsByTagName('input');
                if (!check.checked) {
                    check.checked = true;
                    t.parentNode.classList.remove('active');
                }
            });
        }
        return this.#show_dialog();
    }

    select_project(list, is_save) {
        this.ok_button.textContent = is_save ? this.lang.res.save : this.lang.res.open;
        this.ok_button.style.display = '';
        this.ok_button.disabled = true;
        this.cancel_button.textContent = this.lang.res.cancel;
        this.filelist_area.style.display = '';
        this.filename_area.style.display = '';

        this.filelist_area.replaceChildren();
        for (const pj of list) {
            const row = $e('div', {'class':'file-list-item'}, $e('div'), $e('div', {'class':'proj-list-item'}, pj.name));
            this.filelist_area.appendChild(row);
            row.addEventListener('click', e => {
                this.filename_input.value = e.currentTarget.childNodes[1].textContent;
                this.#on_update_filename();
            });
        }
        return this.#show_dialog();
    }

    #on_update_filename() {
        const s = this.filename_input.value;
        this.ok_button.disabled = s.length === 0;
        for (const item of this.filelist_area.childNodes) {
            if (s === item.childNodes[1].textContent) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    }

    manage_project(list, db) {
        this.cancel_button.textContent = this.lang.res.close;
        this.filelist_area.style.display = '';
        this.file_input.setAttribute('accept', '.nvtts');

        this.url = [];
        this.filelist_area.replaceChildren();

        const upload_row = $e('div', {'class':'file-list-add'},
            $e('div'), $e('div', null, this.lang.res['upload-area2']), $e('div', null, create_icon('+')));
        upload_row.addEventListener('click', () => {
            this.file_input.click();
        });
        this.filelist_area.appendChild(upload_row);

        function add_row(name, obj, filelist, url_list) {
            const dl = $e('a', {'class':'file-list-dl'}, create_icon('d'));
            const close = $e('div', {'class':'file-list-close'}, create_icon('x'));
            const row = $e('div', {'class':'file-list-item'}, dl, $e('div', {'class':'proj-list-item'}, name), close);

            const url = URL.createObjectURL(new Blob([JSON.stringify(obj)]));
            dl.setAttribute('href', url);
            url_list.push(url);
            dl.setAttribute('download', name + '.nvtts');

            close.addEventListener('click', e => {
                const t = e.currentTarget.parentNode;
                const n = t.childNodes[1].textContent;
                db.delete_project(n);
                t.remove();
            });

            filelist.insertBefore(row, upload_row);
        }
        for (const pj of list) {
            add_row(pj.name, pj.value, this.filelist_area, this.url);
        }
        this.on_upload_file = async (file) => {
            const name = file.name.replace(/\.nvtts$/i, '');
            const src = await file.text();
            const obj = JSON.parse(src);
            db.save_project(name, obj);
            add_row(name, obj, this.filelist_area, this.url);
        };

        return this.#show_dialog();
    }
}
