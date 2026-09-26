import time, app
app.show_quote_once()
time.sleep(2)
popup = app.ACTIVE_POPUP.get('popup')
print('popup_is_none=', popup is None)
print('root_is_none=', app.ACTIVE_POPUP.get('root') is None)
if popup is not None:
    print('children=', popup.winfo_children())
    print('title=', popup.title())
    for i, child in enumerate(popup.winfo_children()):
        print('child', i, type(child).__name__, child.winfo_class())
        try:
            print('text=', child.cget('text'))
        except Exception:
            pass
