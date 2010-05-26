if [ -f example.zip ]
then
	rm example.zip
fi
cd helma
zip -9 -r ../example.zip * -x "*/.DS_Store" "*/.svn/*" app.properties db.properties
cd ..
